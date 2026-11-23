import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { isClerkConfigured } from '../lib/clerkConfig';
import { parseApiJson } from '../lib/api';

export type AppRole = 'customer' | 'staff' | 'owner' | 'manager';

export interface LocalPortalCredentials {
  email?: string;
  passcode: string;
}

export interface LocalPortalSetupPayload {
  fullName: string;
  email: string;
  passcode: string;
}

export interface AppAuthState {
  isClerkConfigured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  authResolved: boolean;
  userId: string | null;
  fullName: string | null;
  email: string | null;
  imageUrl: string | null;
  role: AppRole;
  isManager: boolean;
  permissions: string[];
  canAccessAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  refreshAuthorization: () => Promise<void>;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  signInLocalPortal: (credentials: LocalPortalCredentials) => Promise<void>;
  setupLocalPortal: (payload: LocalPortalSetupPayload) => Promise<void>;
}

const AppAuthContext = createContext<AppAuthState | undefined>(undefined);

interface ServerMePayload {
  authorization?: {
    role?: AppRole;
    permissions?: string[];
    canAccessAdmin?: boolean;
  };
}

interface LocalPortalAuthResponse {
  token: string;
  expiresAt?: string;
  user: {
    userId: string;
    fullName: string | null;
    email: string | null;
  };
  role: AppRole;
  permissions: string[];
  canAccessAdmin: boolean;
}

function ClerkBackedAuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [role, setRole] = useState<AppRole>('customer');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  // Optional in-memory portal fallback session when signed in via ADMIN_PASSCODE (e.g. embedded view)
  const [fallbackSession, setFallbackSession] = useState<LocalPortalAuthResponse | null>(null);

  const safeGetToken = useCallback(async () => {
    if (fallbackSession?.token) {
      return fallbackSession.token;
    }
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [fallbackSession, getToken]);

  const fetchServerAuthorization = useCallback(async () => {
    if (fallbackSession?.token) {
      try {
        const res = await fetch('/api/me', {
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${fallbackSession.token}` },
        });
        if (!res.ok) {
          setFallbackSession(null);
          return;
        }
        const data = await parseApiJson<ServerMePayload>(
          res,
          'Unable to verify application authorization.'
        );
        const resolvedRole = data.authorization?.role;
        const validRole: AppRole =
          resolvedRole === 'owner' || resolvedRole === 'manager' || resolvedRole === 'staff'
            ? resolvedRole
            : 'customer';
        const resolvedPerms = Array.isArray(data.authorization?.permissions)
          ? data.authorization!.permissions
          : [];
        const adminAllowed =
          Boolean(data.authorization?.canAccessAdmin) &&
          (validRole === 'owner' || validRole === 'manager' || validRole === 'staff');
        setFallbackSession((prev) =>
          prev
            ? {
                ...prev,
                role: validRole,
                permissions: resolvedPerms,
                canAccessAdmin: adminAllowed,
              }
            : null
        );
        setAuthResolved(true);
      } catch {
        setFallbackSession(null);
      }
      return;
    }

    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      setRole('customer');
      setPermissions([]);
      setCanAccessAdmin(false);
      setAuthResolved(true);
      return;
    }

    setAuthResolved(false);
    try {
      const token = await safeGetToken();
      if (!token) {
        setRole('customer');
        setPermissions([]);
        setCanAccessAdmin(false);
        return;
      }

      const res = await fetch('/api/me', {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiJson<ServerMePayload>(
        res,
        'Unable to verify application authorization.'
      );

      const resolvedRole = data.authorization?.role;
      const validRole: AppRole =
        resolvedRole === 'owner' || resolvedRole === 'manager' || resolvedRole === 'staff'
          ? resolvedRole
          : 'customer';
      const resolvedPerms = Array.isArray(data.authorization?.permissions)
        ? data.authorization!.permissions
        : [];
      const adminAllowed =
        Boolean(data.authorization?.canAccessAdmin) &&
        (validRole === 'owner' || validRole === 'manager' || validRole === 'staff');

      setRole(validRole);
      setPermissions(resolvedPerms);
      setCanAccessAdmin(adminAllowed);
    } catch {
      // Fail closed to least-privileged customer role if server verification fails
      setRole('customer');
      setPermissions([]);
      setCanAccessAdmin(false);
    } finally {
      setAuthResolved(true);
    }
  }, [fallbackSession?.token, isLoaded, isSignedIn, userId, safeGetToken]);

  useEffect(() => {
    void fetchServerAuthorization();
  }, [fetchServerAuthorization]);

  const effectiveRole: AppRole = fallbackSession ? fallbackSession.role : role;
  const effectivePermissions = fallbackSession ? fallbackSession.permissions : permissions;
  const effectiveCanAccessAdmin = fallbackSession ? fallbackSession.canAccessAdmin : canAccessAdmin;

  const hasPermission = useCallback(
    (permission: string) => effectivePermissions.includes(permission),
    [effectivePermissions]
  );

  const isManager = effectiveRole === 'owner' || effectiveRole === 'manager';

  const signInLocalPortal = useCallback(async ({ email: portalEmail, passcode }: LocalPortalCredentials) => {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: portalEmail, passcode }),
    });
    const data = await parseApiJson<LocalPortalAuthResponse>(
      res,
      'Unable to sign in to the portal.'
    );
    setFallbackSession(data);
    setAuthResolved(true);
  }, []);

  const value: AppAuthState = {
    isClerkConfigured: true,
    isLoaded: fallbackSession ? true : isLoaded,
    isSignedIn: Boolean(fallbackSession || isSignedIn),
    authResolved: fallbackSession ? true : authResolved,
    userId: fallbackSession?.user.userId ?? userId ?? null,
    fullName: fallbackSession?.user.fullName ?? (user?.fullName || user?.firstName || null),
    email: fallbackSession?.user.email ?? (user?.primaryEmailAddress?.emailAddress || null),
    imageUrl: fallbackSession ? null : user?.imageUrl || null,
    role: effectiveRole,
    isManager,
    permissions: effectivePermissions,
    canAccessAdmin: effectiveCanAccessAdmin,
    hasPermission,
    refreshAuthorization: fetchServerAuthorization,
    getToken: safeGetToken,
    signOut: async () => {
      const fbToken = fallbackSession?.token;
      setFallbackSession(null);
      setRole('customer');
      setPermissions([]);
      setCanAccessAdmin(false);
      if (fbToken) {
        try {
          await fetch('/api/auth/admin/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${fbToken}` },
          });
        } catch {
          // Ignore logout network error
        }
      }
      if (isSignedIn) {
        await signOut({ redirectUrl: '/' });
      }
    },
    signInLocalPortal,
    setupLocalPortal: async () => {
      throw new Error('Clerk authentication is active.');
    },
  };

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

function LocalPortalAuthProvider({ children }: { children: React.ReactNode }) {
  // Keep portal session token & identity strictly in React memory (never localStorage/sessionStorage)
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('customer');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

  const applyPortalAuth = useCallback((data: LocalPortalAuthResponse) => {
    const validRole: AppRole =
      data.role === 'owner' || data.role === 'manager' || data.role === 'staff'
        ? data.role
        : 'customer';
    const perms = Array.isArray(data.permissions) ? data.permissions : [];
    setSessionToken(data.token);
    setUserId(data.user.userId);
    setFullName(data.user.fullName);
    setEmail(data.user.email);
    setRole(validRole);
    setPermissions(perms);
    setCanAccessAdmin(
      Boolean(data.canAccessAdmin) &&
        (validRole === 'owner' || validRole === 'manager' || validRole === 'staff')
    );
  }, []);

  const clearPortalSession = useCallback(() => {
    setSessionToken(null);
    setUserId(null);
    setFullName(null);
    setEmail(null);
    setRole('customer');
    setPermissions([]);
    setCanAccessAdmin(false);
  }, []);

  const refreshAuthorization = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/me', {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) {
        clearPortalSession();
        return;
      }
      const data = await parseApiJson<ServerMePayload>(
        res,
        'Unable to verify portal authorization.'
      );
      const resolvedRole = data.authorization?.role;
      const validRole: AppRole =
        resolvedRole === 'owner' || resolvedRole === 'manager' || resolvedRole === 'staff'
          ? resolvedRole
          : 'customer';
      const resolvedPerms = Array.isArray(data.authorization?.permissions)
        ? data.authorization!.permissions
        : [];
      setRole(validRole);
      setPermissions(resolvedPerms);
      setCanAccessAdmin(
        Boolean(data.authorization?.canAccessAdmin) &&
          (validRole === 'owner' || validRole === 'manager' || validRole === 'staff')
      );
    } catch {
      clearPortalSession();
    }
  }, [sessionToken, clearPortalSession]);

  const signInLocalPortal = useCallback(
    async ({ email: portalEmail, passcode }: LocalPortalCredentials) => {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: portalEmail, passcode }),
      });
      const data = await parseApiJson<LocalPortalAuthResponse>(
        res,
        'Unable to sign in to the portal.'
      );
      applyPortalAuth(data);
    },
    [applyPortalAuth]
  );

  const setupLocalPortal = useCallback(
    async (payload: LocalPortalSetupPayload) => {
      const res = await fetch('/api/auth/admin/setup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseApiJson<LocalPortalAuthResponse>(
        res,
        'Unable to complete initial portal setup.'
      );
      applyPortalAuth(data);
    },
    [applyPortalAuth]
  );

  const signOut = useCallback(async () => {
    const tokenToInvalidate = sessionToken;
    clearPortalSession();
    if (tokenToInvalidate) {
      try {
        await fetch('/api/auth/admin/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${tokenToInvalidate}` },
        });
      } catch {
        // Ignore network failure during logout cleanup
      }
    }
  }, [sessionToken, clearPortalSession]);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const value: AppAuthState = {
    isClerkConfigured: false,
    isLoaded: true,
    isSignedIn: Boolean(sessionToken && userId),
    authResolved: true,
    userId,
    fullName,
    email,
    imageUrl: null,
    role,
    isManager: role === 'owner' || role === 'manager',
    permissions,
    canAccessAdmin,
    hasPermission,
    refreshAuthorization,
    getToken: async () => sessionToken,
    signOut,
    signInLocalPortal,
    setupLocalPortal,
  };

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function AppAuthProvider({
  clerkConfigured = isClerkConfigured,
  children,
}: {
  clerkConfigured?: boolean;
  children: React.ReactNode;
}) {
  if (clerkConfigured) {
    return <ClerkBackedAuthProvider>{children}</ClerkBackedAuthProvider>;
  }
  return <LocalPortalAuthProvider>{children}</LocalPortalAuthProvider>;
}

export function useAppAuth(): AppAuthState {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error('useAppAuth must be used within AppAuthProvider');
  }
  return ctx;
}
