import type { NextFunction, Request, Response } from 'express';
import { getAuth, type clerkClient as ClerkClientType } from '@clerk/express';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.ts';

// 'owner' in DB schema corresponds to full-access Manager; 'manager' alias is also accepted cleanly.
export type AppRole = 'customer' | 'staff' | 'owner' | 'manager';

export type AppPermission =
  | 'account:read'
  | 'cart:read'
  | 'cart:write'
  | 'admin:access'
  | 'orders:read'
  | 'orders:update'
  | 'notifications:read'
  | 'menu:manage'
  | 'pricing:approve'
  | 'categories:manage'
  | 'catering:manage'
  | 'customers:read'
  | 'analytics:read'
  | 'reports:read'
  | 'staff:manage'
  | 'settings:manage'
  | 'audit:read';

export type RoleResolutionSource = 'supabase_database' | 'default_customer';

export interface AccessPolicy {
  role: AppRole;
  permissions: AppPermission[];
  source: RoleResolutionSource;
}

export interface AuthAuditEntry {
  id?: string;
  timestamp: string;
  actorUserId: string;
  actorRole: AppRole;
  action: string;
  target: string;
  outcome: 'allowed' | 'denied';
  reason?: string;
}

export interface AuthenticatedRequest extends Request {
  appAuth?: {
    userId: string;
    orgId: string | null;
    orgRole: string | null;
    verifiedEmail: string | null;
    fullName: string | null;
    policy: AccessPolicy;
  };
}

const MANAGER_PERMISSIONS: AppPermission[] = [
  'account:read',
  'cart:read',
  'cart:write',
  'admin:access',
  'orders:read',
  'orders:update',
  'notifications:read',
  'menu:manage',
  'pricing:approve',
  'categories:manage',
  'catering:manage',
  'customers:read',
  'analytics:read',
  'reports:read',
  'staff:manage',
  'settings:manage',
  'audit:read',
];

export const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  customer: ['account:read', 'cart:read', 'cart:write'],
  // Staff can strictly view orders and update order processing statuses — no financial analytics, payment settings, staff management, or sensitive website/admin settings.
  staff: [
    'account:read',
    'cart:read',
    'cart:write',
    'admin:access',
    'orders:read',
    'orders:update',
    'notifications:read',
  ],
  owner: [...MANAGER_PERMISSIONS],
  manager: [...MANAGER_PERMISSIONS],
};

export const VALID_MEAL_IDS = new Set([
  'spaghetti',
  'beans-and-plantain',
  'dodo',
  'jollof-rice-and-chicken',
  'fried-rice-and-beef',
  'santana',
  'semovita',
  'egusi-soup',
  'black-soup',
  'ogbono-soup',
]);

// Bounded in-memory audit trail synchronized alongside Supabase audit_logs
export const recentAuditLogs: AuthAuditEntry[] = [];

export function isManagerRole(role: AppRole | string | undefined | null): boolean {
  return role === 'owner' || role === 'manager';
}

export function normalizeClerkEnvValue(raw: string | undefined): string {
  let val = (raw || '').trim();
  if (/^[A-Z0-9_]+=(.+)$/.test(val)) {
    val = val.slice(val.indexOf('=') + 1).trim();
  }
  return val.replace(/^['"]|['"]$/g, '').trim();
}

export function getServerClerkKeys(): {
  publishableKey: string;
  secretKey: string;
} {
  const publishableKey = normalizeClerkEnvValue(
    process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY
  );
  const secretKey = normalizeClerkEnvValue(process.env.CLERK_SECRET_KEY);
  return { publishableKey, secretKey };
}

export function isServerClerkConfigured(): boolean {
  const { publishableKey, secretKey } = getServerClerkKeys();
  const validPub = /^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(publishableKey);
  const validSec = /^sk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(secretKey);
  return validPub && validSec;
}

export function getPaystackSecretKey(): string {
  return normalizeClerkEnvValue(process.env.PAYSTACK_SECRET_KEY);
}

export function isServerPaystackConfigured(): boolean {
  return /^sk_(test|live)_[A-Za-z0-9_-]+$/.test(getPaystackSecretKey());
}

export async function isOwnerInitialized(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['owner', 'manager']);
      if ((count ?? 0) > 0) return true;
      return false;
    } catch {
      // fall through
    }
  }
  return true;
}

export function isOwnerProvisioningConfigured(): boolean {
  return isSupabaseConfigured();
}

export function recordAuthAuditEvent(entry: AuthAuditEntry): void {
  const normalized: AuthAuditEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
  };
  recentAuditLogs.unshift(normalized);
  if (recentAuditLogs.length > 200) {
    recentAuditLogs.length = 200;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    void supabase.from('audit_logs').insert({
      actor_user_id: entry.actorUserId,
      actor_role: entry.actorRole,
      action: entry.action,
      target: entry.target,
      outcome: entry.outcome,
      reason: entry.reason ?? null,
    });
  }
  console.info(
    JSON.stringify({
      event: 'yomat_kitchen_auth_audit',
      ...entry,
    })
  );
}

export function getOwnerEmails(): string[] {
  return (process.env.OWNER_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function resolveAccessPolicyFromIdentity(params: {
  userId: string;
  verifiedPrimaryEmail: string | null;
  fullName: string | null;
}): Promise<AccessPolicy> {
  const supabase = getSupabaseAdmin();
  const fallbackEmail = params.verifiedPrimaryEmail || `${params.userId}@clerk.user`;
  const normalizedEmail = (params.verifiedPrimaryEmail || '').trim().toLowerCase();
  const isPrimaryOwner = Boolean(normalizedEmail) && getOwnerEmails().includes(normalizedEmail);

  if (supabase) {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', params.userId)
        .maybeSingle();

      if (existingProfile) {
        let rawRole = existingProfile.role as AppRole;
        if (isPrimaryOwner && rawRole !== 'owner') {
          rawRole = 'owner';
          await supabase
            .from('profiles')
            .update({ role: 'owner', updated_at: new Date().toISOString() })
            .eq('id', params.userId);
        }
        const role: AppRole =
          rawRole === 'owner' || rawRole === 'manager' || rawRole === 'staff'
            ? rawRole
            : 'customer';
        return {
          role,
          permissions: [...(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.customer)],
          source: 'supabase_database',
        };
      }

      let assignedRole: AppRole = isPrimaryOwner ? 'owner' : 'customer';
      if (!isPrimaryOwner && params.verifiedPrimaryEmail) {
        const { data: invite } = await supabase
          .from('staff_invitations')
          .select('role, permissions, status')
          .eq('email', normalizedEmail)
          .eq('status', 'pending')
          .maybeSingle();

        if (invite) {
          const inviteRole = invite.role as AppRole;
          assignedRole =
            inviteRole === 'owner' || inviteRole === 'manager' ? 'owner' : 'staff';
          await supabase
            .from('staff_invitations')
            .update({ status: 'accepted' })
            .eq('email', normalizedEmail);
        }
      }

      await supabase.from('profiles').upsert({
        id: params.userId,
        email: fallbackEmail,
        full_name: params.fullName,
        role: assignedRole,
        updated_at: new Date().toISOString(),
      });

      return {
        role: assignedRole,
        permissions: [...(ROLE_PERMISSIONS[assignedRole] || ROLE_PERMISSIONS.customer)],
        source: 'supabase_database',
      };
    } catch (err) {
      console.error('Database role resolution error:', err);
    }
  }

  const fallbackRole: AppRole = isPrimaryOwner ? 'owner' : 'customer';
  return {
    role: fallbackRole,
    permissions: [...(ROLE_PERMISSIONS[fallbackRole] || ROLE_PERMISSIONS.customer)],
    source: 'default_customer',
  };
}

export function createRequireAuthenticatedSession(
  clerkClient: typeof ClerkClientType | null
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!isServerClerkConfigured() || !clerkClient) {
      res.status(503).json({
        error: 'Authentication service is not configured yet on the server.',
      });
      return;
    }

    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({
        error: 'Authentication required. Please sign in to access this resource.',
      });
      return;
    }

    try {
      const user = await clerkClient.users.getUser(auth.userId);
      const primaryEmailObj =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
        user.emailAddresses[0] ??
        null;

      const verifiedEmail =
        primaryEmailObj?.verification?.status === 'verified'
          ? primaryEmailObj.emailAddress
          : null;

      const fullName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

      const policy = await resolveAccessPolicyFromIdentity({
        userId: user.id,
        verifiedPrimaryEmail: verifiedEmail,
        fullName,
      });

      req.appAuth = {
        userId: user.id,
        orgId: auth.orgId ?? null,
        orgRole: auth.orgRole ?? null,
        verifiedEmail: primaryEmailObj?.emailAddress ?? null,
        fullName,
        policy,
      };

      next();
    } catch (error) {
      console.error('Failed to verify Clerk session identity:', error);
      res.status(500).json({
        error: 'Unable to verify authenticated session identity.',
      });
    }
  };
}

export function requirePermission(permission: AppPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const appAuth = req.appAuth;
    const policy = appAuth?.policy;

    if (!appAuth || !policy || !policy.permissions.includes(permission)) {
      if (appAuth && req.originalUrl.includes('/admin')) {
        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: appAuth.userId,
          actorRole: policy?.role ?? 'customer',
          action: req.method,
          target: req.originalUrl,
          outcome: 'denied',
          reason: `missing_permission:${permission}`,
        });
      }

      res.status(403).json({
        error: `Forbidden: missing required permission (${permission}).`,
      });
      return;
    }

    next();
  };
}

export function requireRole(...allowedRoles: AppRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const appAuth = req.appAuth;
    const role = appAuth?.policy.role;

    const effectiveAllowed = new Set<AppRole>(allowedRoles);
    if (effectiveAllowed.has('owner')) effectiveAllowed.add('manager');
    if (effectiveAllowed.has('manager')) effectiveAllowed.add('owner');

    if (!appAuth || !role || !effectiveAllowed.has(role)) {
      if (appAuth && req.originalUrl.includes('/admin')) {
        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: appAuth.userId,
          actorRole: role ?? 'customer',
          action: req.method,
          target: req.originalUrl,
          outcome: 'denied',
          reason: `role_not_in:${allowedRoles.join('|')}`,
        });
      }

      res.status(403).json({
        error: 'Forbidden: insufficient role privileges for this resource.',
      });
      return;
    }

    next();
  };
}

export function isResourceOwner(
  authenticatedUserId: string,
  resourceOwnerId: string
): boolean {
  return authenticatedUserId === resourceOwnerId;
}
