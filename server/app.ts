import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { clerkMiddleware, createClerkClient } from '@clerk/express';
import {
  type AuthenticatedRequest,
  ROLE_PERMISSIONS,
  createRequireAuthenticatedSession,
  getConfiguredAdminPasscode,
  getOwnerEmails,
  getPaystackSecretKey,
  getPrimaryAdminProfileSummary,
  getServerClerkKeys,
  hashPortalPasscode,
  isManagerRole,
  isOwnerInitialized,
  isOwnerProvisioningConfigured,
  isPortalAdminCredentialReady,
  isResourceOwner,
  isServerClerkConfigured,
  isServerPaystackConfigured,
  issuePortalSessionToken,
  loadPrimaryAdminCredential,
  portalStaffAccounts,
  portalStaffInvitations,
  recentAuditLogs,
  recordAuthAuditEvent,
  requirePermission,
  requireRole,
  revokedPortalUsers,
  savePrimaryAdminCredential,
  verifyPlaintextSecretTimingSafe,
  verifyPortalPasscode,
} from './authorization.ts';
import {
  INITIAL_SERVER_MEALS,
  type ServerMealInfo,
  getCatalogMeal,
  isKnownCatalogMeal,
  liveMealCatalog,
} from './catalog.ts';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.ts';
import { DISH_PRICING_PROPOSALS } from '../src/data/pricingResearch.ts';

interface StoredCartEntry {
  mealId: string;
  quantity: number;
}

interface UserCartRecord {
  ownerId: string;
  items: StoredCartEntry[];
  updatedAt: string;
}

interface OrderLineItem {
  mealId: string;
  name: string;
  unitPriceNaira: number;
  quantity: number;
  lineTotalNaira: number;
}

interface OrderRecord {
  reference: string;
  ownerId: string;
  email: string;
  items: OrderLineItem[];
  totalNaira: number;
  expectedAmountKobo: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  channel?: string;
  paidAt?: string;
  createdAt: string;
}

interface CateringEnquiry {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  requestedDishes: string;
  notes: string;
  status: 'new' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface WebsiteSettings {
  restaurantName: string;
  currency: string;
  isOpen: boolean;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  heroSubtitle: string;
  heroDescription: string;
  welcomeHeading: string;
  welcomeBody: string;
  menuNotice: string;
}

const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  restaurantName: 'Yomat Kitchen',
  currency: 'NGN',
  isOpen: true,
  address:
    'Behind Science Laboratory Technology, University of Benin, Uselu, Benin City, Edo State, Nigeria.',
  phone: '0807 144 1727',
  email: '',
  openingHours: 'Call 0807 144 1727 for service hours',
  heroSubtitle: 'Delicious West African Meals, Close to You.',
  heroDescription:
    'West African restaurant located Behind Science Laboratory Technology, University of Benin, Uselu, Benin City, Edo State, Nigeria. Call or chat via 0807 144 1727.',
  welcomeHeading: 'Delicious West African Meals, Close to You.',
  welcomeBody:
    'Located Behind Science Laboratory Technology, University of Benin, Uselu, Benin City, Edo State, Nigeria, Yomat Kitchen brings comforting West African cuisine close to students, staff, families, and neighbours.',
  menuNotice:
    'Prices shown in Nigerian Naira (₦). Order directly online via Paystack or reach us on WhatsApp / phone at 0807 144 1727.',
};

function isSafeImagePath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/assets/')) {
    return true;
  }
  if (/^https:\/\//i.test(trimmed)) {
    return true;
  }
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= 450_000;
  }
  return false;
}

function sanitizeCartItems(rawItems: unknown): StoredCartEntry[] | null {
  if (!Array.isArray(rawItems) || rawItems.length > 50) {
    return null;
  }
  const sanitized: StoredCartEntry[] = [];
  for (const entry of rawItems) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof (entry as { mealId?: unknown }).mealId !== 'string' ||
      !isKnownCatalogMeal((entry as { mealId: string }).mealId) ||
      !Number.isInteger((entry as { quantity?: unknown }).quantity) ||
      (entry as { quantity: number }).quantity < 1 ||
      (entry as { quantity: number }).quantity > 99
    ) {
      return null;
    }
    sanitized.push({
      mealId: (entry as { mealId: string }).mealId,
      quantity: (entry as { quantity: number }).quantity,
    });
  }
  return sanitized;
}

function buildLineItems(entries: StoredCartEntry[]): {
  lineItems: OrderLineItem[];
  totalNaira: number;
  expectedAmountKobo: number;
} | null {
  const lineItems: OrderLineItem[] = [];
  let totalNaira = 0;

  for (const entry of entries) {
    const catalogItem = getCatalogMeal(entry.mealId);
    if (!catalogItem || catalogItem.priceNaira <= 0) {
      return null;
    }
    const lineTotalNaira = catalogItem.priceNaira * entry.quantity;
    totalNaira += lineTotalNaira;
    lineItems.push({
      mealId: catalogItem.id,
      name: catalogItem.name,
      unitPriceNaira: catalogItem.priceNaira,
      quantity: entry.quantity,
      lineTotalNaira,
    });
  }

  return {
    lineItems,
    totalNaira,
    expectedAmountKobo: totalNaira * 100,
  };
}

function signOrderMetadata(
  secret: string,
  payload: {
    reference: string;
    userId: string;
    expectedAmountKobo: number;
    items: StoredCartEntry[];
  }
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(
      JSON.stringify({
        reference: payload.reference,
        userId: payload.userId,
        expectedAmountKobo: payload.expectedAmountKobo,
        items: payload.items.map((item) => [item.mealId, item.quantity]),
      })
    )
    .digest('hex');
}

function verifyOrderMetadataSignature(
  secret: string,
  payload: {
    reference: string;
    userId: string;
    expectedAmountKobo: number;
    items: StoredCartEntry[];
  },
  providedSig: string
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(providedSig)) {
    return false;
  }
  const expectedSig = signOrderMetadata(secret, payload);
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig, 'hex'),
    Buffer.from(providedSig.toLowerCase(), 'hex')
  );
}

function resolveCallbackUrl(req: express.Request): string | undefined {
  const originHeader = req.get('origin')?.trim();
  if (originHeader && /^https?:\/\/[^/]+$/i.test(originHeader)) {
    return `${originHeader}/cart`;
  }

  const forwardedHost = req.get('x-forwarded-host') || req.get('host');
  const forwardedProto = req.get('x-forwarded-proto') || req.protocol || 'https';
  if (forwardedHost && !forwardedHost.startsWith('localhost:')) {
    return `${forwardedProto}://${forwardedHost}/cart`;
  }

  const envUrl = (process.env.URL || process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/.+/i.test(envUrl) && !envUrl.includes('MY_APP_URL')) {
    return `${envUrl}/cart`;
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}/cart`;
  }

  return undefined;
}

export function createApiApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '750kb' }));

  app.use((req, _res, next) => {
    const prefix = '/.netlify/functions/api';
    if (req.url === prefix || req.url.startsWith(`${prefix}?`)) {
      req.url = `/api${req.url.slice(prefix.length)}`;
    } else if (req.url.startsWith(`${prefix}/`)) {
      req.url = `/api${req.url.slice(prefix.length)}`;
    }
    next();
  });

  const { publishableKey: serverPublishableKey, secretKey: serverSecretKey } =
    getServerClerkKeys();

  const serverClerkClient = isServerClerkConfigured()
    ? createClerkClient({
        publishableKey: serverPublishableKey,
        secretKey: serverSecretKey,
      })
    : null;

  const requireAuthenticatedSession =
    createRequireAuthenticatedSession(serverClerkClient);

  if (isServerClerkConfigured()) {
    app.use(
      '/api',
      clerkMiddleware({
        publishableKey: serverPublishableKey,
        secretKey: serverSecretKey,
      })
    );
  }

  interface NotificationRecord {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  }

  const userCarts = new Map<string, UserCartRecord>();
  const ordersByReference = new Map<string, OrderRecord>();
  let liveSettings: WebsiteSettings = { ...DEFAULT_WEBSITE_SETTINGS };
  const liveCategories: Array<{ id: string; name: string; sort_order: number }> = [
    { id: 'rice-dishes', name: 'Rice Dishes', sort_order: 1 },
    { id: 'swallows-and-soups', name: 'Swallows & Soups', sort_order: 2 },
    { id: 'other-specials', name: 'Other Specials', sort_order: 3 },
  ];
  const cateringEnquiries: CateringEnquiry[] = [];
  const liveNotifications: NotificationRecord[] = [];

  async function pushNotification(params: {
    title: string;
    message: string;
    type: string;
  }): Promise<void> {
    const entry: NotificationRecord = {
      id: `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      title: params.title,
      message: params.message,
      type: params.type,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    liveNotifications.unshift(entry);
    if (liveNotifications.length > 50) {
      liveNotifications.length = 50;
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          title: params.title,
          message: params.message,
          type: params.type,
        });
      } catch {
        // Retain in-memory notification
      }
    }
  }

  async function ensureCategoryInSupabase(
    supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
    categoryName: string,
    sortOrder = 10
  ): Promise<void> {
    const clean = categoryName.trim().slice(0, 60) || 'Rice Dishes';
    const slug =
      clean
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'category';
    try {
      await supabase
        .from('categories')
        .upsert({ id: slug, name: clean, sort_order: sortOrder }, { onConflict: 'name', ignoreDuplicates: true });
    } catch {
      // Ignore duplicate / schema sync issues
    }
  }

  async function ensureMealInSupabase(
    supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
    meal: ServerMealInfo
  ): Promise<void> {
    await ensureCategoryInSupabase(supabase, meal.category);
    try {
      await supabase.from('menu_items').upsert(
        {
          id: meal.id,
          name: meal.name,
          category: meal.category,
          short_description: meal.shortDescription,
          full_description: meal.fullDescription,
          ingredients_highlight: [],
          prep_style: meal.prepStyle,
          price_naira: meal.priceNaira,
          image: meal.image,
          is_available: meal.isAvailable,
          is_featured: meal.isFeatured,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    } catch {
      // Ignore duplicate / schema sync issues
    }
  }

  let catalogAlignmentPromise: Promise<void> | null = null;
  const STALE_TIMESTAMP_IMAGE_RE = /^\/src\/assets\/images\/.*_[0-9]{13}\.(jpg|jpeg|png|webp)$/i;
  const SOUP_NAME_UPGRADES: Record<string, string> = {
    'Eba & Afang': 'Eba & Afang Soup',
    'Eba & Egusi': 'Eba & Egusi Soup',
    'Eba & Okra': 'Eba & Okra Soup',
    'Semo & Ogbono': 'Semo & Ogbono Soup',
  };

  async function ensureCatalogAlignedInSupabase(
    supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>
  ): Promise<void> {
    if (catalogAlignmentPromise) {
      return catalogAlignmentPromise;
    }

    catalogAlignmentPromise = (async () => {
      try {
        for (const cat of liveCategories) {
          await ensureCategoryInSupabase(supabase, cat.name, cat.sort_order);
        }

        const { data: existingRows } = await supabase.from('menu_items').select('*');
        const byId = new Map<string, Record<string, unknown>>(
          (existingRows || []).map((row: Record<string, unknown>) => [String(row.id), row])
        );

        for (const meal of INITIAL_SERVER_MEALS) {
          const existingRow = byId.get(meal.id);
          if (!existingRow) {
            await ensureCategoryInSupabase(supabase, meal.category);
            await supabase.from('menu_items').upsert({
              id: meal.id,
              name: meal.name,
              category: meal.category,
              short_description: meal.shortDescription,
              full_description: meal.fullDescription,
              ingredients_highlight: [],
              prep_style: meal.prepStyle,
              price_naira: meal.priceNaira,
              image: meal.image,
              is_available: meal.isAvailable,
              is_featured: meal.isFeatured,
            });
            continue;
          }

          const updates: Record<string, unknown> = {};
          const dbImage = typeof existingRow.image === 'string' ? existingRow.image.trim() : '';
          if (!dbImage || STALE_TIMESTAMP_IMAGE_RE.test(dbImage)) {
            updates.image = meal.image;
          }
          const dbPrice = Number(existingRow.price_naira ?? 0);
          if (!Number.isFinite(dbPrice) || dbPrice <= 0) {
            updates.price_naira = meal.priceNaira;
          }
          const dbName = typeof existingRow.name === 'string' ? existingRow.name.trim() : '';
          if (SOUP_NAME_UPGRADES[dbName]) {
            updates.name = SOUP_NAME_UPGRADES[dbName];
          }
          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            await supabase.from('menu_items').update(updates).eq('id', meal.id);
          }
        }
      } catch (err) {
        console.error('Catalog alignment warning:', err);
        catalogAlignmentPromise = null;
      }
    })();

    return catalogAlignmentPromise;
  }

  async function syncCatalogWithDatabase(): Promise<ServerMealInfo[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await ensureCatalogAlignedInSupabase(supabase);
        const { data } = await supabase.from('menu_items').select('*').order('name');
        if (Array.isArray(data) && data.length > 0) {
          for (const row of data) {
            const existing = liveMealCatalog.get(row.id);
            const numericPrice = Number(row.price_naira ?? 0);
            const fallbackPrice = existing?.priceNaira ?? 0;
            const resolvedPrice =
              Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : fallbackPrice;
            const resolvedCategory =
              typeof row.category === 'string' && row.category.trim()
                ? row.category.trim()
                : existing?.category || 'Rice Dishes';
            const rawImage = typeof row.image === 'string' ? row.image.trim() : '';
            const resolvedImage =
              rawImage && !STALE_TIMESTAMP_IMAGE_RE.test(rawImage)
                ? rawImage
                : existing?.image || '/src/assets/images/dish_jollof_chicken.jpg';
            const rawName = typeof row.name === 'string' ? row.name.trim() : '';
            const resolvedName = SOUP_NAME_UPGRADES[rawName] || rawName || existing?.name || row.id;

            liveMealCatalog.set(row.id, {
              id: row.id,
              name: resolvedName,
              category: resolvedCategory,
              shortDescription: row.short_description || existing?.shortDescription || '',
              fullDescription: row.full_description || existing?.fullDescription || '',
              prepStyle: row.prep_style || existing?.prepStyle || 'Nigerian Dish',
              priceNaira: resolvedPrice,
              priceConfirmed: resolvedPrice > 0,
              image: resolvedImage,
              imageAlt: existing?.imageAlt || resolvedName,
              isAvailable: row.is_available ?? true,
              isFeatured: row.is_featured ?? existing?.isFeatured ?? false,
            });
          }
        }
      } catch {
        // Fall back to in-memory live catalog
      }
    }
    return Array.from(liveMealCatalog.values());
  }

  async function loadWebsiteSettings(): Promise<WebsiteSettings> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('key', 'general')
          .maybeSingle();
        if (data?.value && typeof data.value === 'object') {
          liveSettings = { ...DEFAULT_WEBSITE_SETTINGS, ...(data.value as Partial<WebsiteSettings>) };
        }
      } catch {
        // Use in-memory liveSettings
      }
    }
    return liveSettings;
  }

  async function loadCateringList(): Promise<CateringEnquiry[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('key', 'catering_enquiries')
          .maybeSingle();
        if (Array.isArray(data?.value)) {
          return data.value as CateringEnquiry[];
        }
      } catch {
        // Fall back to in-memory cateringEnquiries
      }
    }
    return cateringEnquiries;
  }

  async function saveCateringList(list: CateringEnquiry[]): Promise<void> {
    cateringEnquiries.length = 0;
    cateringEnquiries.push(...list);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('restaurant_settings').upsert({
          key: 'catering_enquiries',
          value: list,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Keep in-memory state
      }
    }
  }

  app.get('/api/health', async (_req, res) => {
    const initialized = await isOwnerInitialized();
    const portalReady = await isPortalAdminCredentialReady();
    res.json({
      status: 'ok',
      clerkConfigured: isServerClerkConfigured(),
      paystackConfigured: isServerPaystackConfigured(),
      ownerInitialized: initialized,
      databaseConfigured: isSupabaseConfigured(),
      portalReady,
    });
  });

  // Standalone Portal Authentication Routes (active when Clerk SSO is not configured)
  app.get('/api/auth/admin/status', async (_req, res) => {
    const clerkConfigured = isServerClerkConfigured();
    const passcodeEnvConfigured = getConfiguredAdminPasscode().length > 0;
    const credentialReady = await isPortalAdminCredentialReady();
    res.json({
      clerkConfigured,
      passcodeEnvConfigured,
      setupRequired: !clerkConfigured && !credentialReady,
      staffCount: portalStaffAccounts.size,
    });
  });

  app.post('/api/auth/admin/setup', async (req, res) => {
    if (isServerClerkConfigured()) {
      res.status(400).json({ error: 'Clerk authentication is active; sign in with Clerk instead.' });
      return;
    }

    if (await isPortalAdminCredentialReady()) {
      res.status(403).json({
        error: 'Initial admin passcode has already been claimed. Please sign in instead.',
      });
      return;
    }

    const fullName =
      typeof req.body?.fullName === 'string' && req.body.fullName.trim()
        ? req.body.fullName.trim().slice(0, 80)
        : 'Yomat Kitchen Manager';
    const email =
      typeof req.body?.email === 'string' && req.body.email.includes('@')
        ? req.body.email.trim().toLowerCase().slice(0, 120)
        : 'manager@yomatkitchen.ng';
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';

    if (passcode.length < 8) {
      res.status(400).json({ error: 'Choose an admin passcode of at least 8 characters.' });
      return;
    }

    const { salt, hash } = hashPortalPasscode(passcode);
    const cred = {
      id: 'portal-owner',
      email,
      fullName,
      role: 'owner' as const,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    await savePrimaryAdminCredential(cred);

    const { token, expiresAt } = issuePortalSessionToken({
      userId: cred.id,
      email: cred.email,
      fullName: cred.fullName,
      role: 'owner',
    });

    recordAuthAuditEvent({
      timestamp: new Date().toISOString(),
      actorUserId: cred.id,
      actorRole: 'owner',
      action: 'POST',
      target: '/api/auth/admin/setup',
      outcome: 'allowed',
      reason: 'first_run_manager_setup_claimed',
    });

    res.status(201).json({
      token,
      expiresAt,
      user: {
        userId: cred.id,
        fullName: cred.fullName,
        email: cred.email,
      },
      role: 'owner',
      permissions: ROLE_PERMISSIONS.owner,
      canAccessAdmin: true,
    });
  });

  app.post('/api/auth/admin/login', async (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const clerkActive = isServerClerkConfigured();
    const envPasscode = getConfiguredAdminPasscode();

    if (clerkActive && !envPasscode) {
      res.status(400).json({ error: 'Clerk authentication is active; sign in with Clerk instead.' });
      return;
    }

    if (!passcode) {
      res.status(400).json({ error: 'Passcode is required.' });
      return;
    }

    // 1. Check specific staff/manager team account if email was provided (standalone mode only)
    if (!clerkActive && rawEmail) {
      const staffMatch = Array.from(portalStaffAccounts.values()).find(
        (s) => s.email === rawEmail && !revokedPortalUsers.has(s.id)
      );
      if (staffMatch && verifyPortalPasscode(passcode, staffMatch.salt, staffMatch.hash)) {
        const effectiveRole =
          staffMatch.role === 'owner' || staffMatch.role === 'manager' || staffMatch.role === 'staff'
            ? staffMatch.role
            : 'customer';
        if (effectiveRole === 'customer') {
          res.status(403).json({ error: 'Portal access for this account has been revoked.' });
          return;
        }
        const { token, expiresAt } = issuePortalSessionToken({
          userId: staffMatch.id,
          email: staffMatch.email,
          fullName: staffMatch.fullName,
          role: effectiveRole,
        });
        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: staffMatch.id,
          actorRole: effectiveRole,
          action: 'POST',
          target: '/api/auth/admin/login',
          outcome: 'allowed',
          reason: `portal_team_login:${staffMatch.email}`,
        });
        res.json({
          token,
          expiresAt,
          user: {
            userId: staffMatch.id,
            fullName: staffMatch.fullName,
            email: staffMatch.email,
          },
          role: effectiveRole,
          permissions: ROLE_PERMISSIONS[effectiveRole],
          canAccessAdmin: true,
        });
        return;
      }
    }

    // 2. Check configured ADMIN_PASSCODE env var (always takes precedence)
    const primaryCred = clerkActive ? null : await loadPrimaryAdminCredential();
    let ownerMatched = false;

    if (envPasscode) {
      ownerMatched = verifyPlaintextSecretTimingSafe(passcode, envPasscode);
    } else if (primaryCred) {
      ownerMatched =
        (!rawEmail || rawEmail === primaryCred.email) &&
        verifyPortalPasscode(passcode, primaryCred.salt, primaryCred.hash);
    }

    if (ownerMatched) {
      const summary = getPrimaryAdminProfileSummary();
      const { token, expiresAt } = issuePortalSessionToken({
        userId: summary.id,
        email: summary.email,
        fullName: summary.full_name || 'Yomat Kitchen Manager',
        role: 'owner',
      });
      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: summary.id,
        actorRole: 'owner',
        action: 'POST',
        target: '/api/auth/admin/login',
        outcome: 'allowed',
        reason: 'portal_manager_login',
      });
      res.json({
        token,
        expiresAt,
        user: {
          userId: summary.id,
          fullName: summary.full_name || 'Yomat Kitchen Manager',
          email: summary.email,
        },
        role: 'owner',
        permissions: ROLE_PERMISSIONS.owner,
        canAccessAdmin: true,
      });
      return;
    }

    recordAuthAuditEvent({
      timestamp: new Date().toISOString(),
      actorUserId: rawEmail || 'anonymous',
      actorRole: 'customer',
      action: 'POST',
      target: '/api/auth/admin/login',
      outcome: 'denied',
      reason: 'invalid_portal_passcode',
    });
    res.status(401).json({ error: 'Invalid email or portal passcode.' });
  });

  app.post('/api/auth/admin/logout', requireAuthenticatedSession, (req: AuthenticatedRequest, res) => {
    recordAuthAuditEvent({
      timestamp: new Date().toISOString(),
      actorUserId: req.appAuth!.userId,
      actorRole: req.appAuth!.policy.role,
      action: 'POST',
      target: '/api/auth/admin/logout',
      outcome: 'allowed',
      reason: 'portal_logout',
    });
    res.json({ success: true });
  });

  // Public Menu Catalogue endpoint (merges live Manager-approved prices, availability & categories)
  app.get('/api/menu', async (_req, res) => {
    const meals = await syncCatalogWithDatabase();
    let publicCategories = [...liveCategories];
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase.from('categories').select('*').order('sort_order');
        if (Array.isArray(data) && data.length > 0) {
          publicCategories = data;
        }
      } catch {
        // Fallback to liveCategories
      }
    }
    res.json({
      meals: meals.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        shortDescription: m.shortDescription,
        fullDescription: m.fullDescription,
        prepStyle: m.prepStyle,
        price: m.priceConfirmed && m.priceNaira > 0 ? m.priceNaira : null,
        image: m.image,
        imageAlt: m.imageAlt,
        isAvailable: m.isAvailable,
        featured: m.isFeatured,
      })),
      categories: publicCategories,
    });
  });

  // Public Website Settings endpoint
  app.get('/api/site-settings', async (_req, res) => {
    const settings = await loadWebsiteSettings();
    res.json({ settings });
  });

  // Public Catering Enquiry submission endpoint
  app.post('/api/catering', async (req, res) => {
    const body = req.body || {};
    const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const eventType = typeof body.eventType === 'string' ? body.eventType.trim() : 'Event Catering';
    const eventDate = typeof body.eventDate === 'string' ? body.eventDate.trim() : '';
    const guestCount = Math.max(1, Math.min(5000, Number(body.guestCount) || 20));
    const requestedDishes =
      typeof body.requestedDishes === 'string' ? body.requestedDishes.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!clientName || !phone || (!requestedDishes && !notes)) {
      res.status(400).json({
        error: 'Client name, phone/WhatsApp number, and event details are required.',
      });
      return;
    }

    const existing = await loadCateringList();
    const record: CateringEnquiry = {
      id: `cat-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      clientName,
      phone,
      email,
      eventType,
      eventDate,
      guestCount,
      requestedDishes,
      notes,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveCateringList([record, ...existing]);

    await pushNotification({
      title: 'New Catering Enquiry',
      message: `${clientName} (${guestCount} guests) requested ${eventType}.`,
      type: 'catering',
    });

    res.status(201).json({ success: true, enquiry: record });
  });

  app.get(
    '/api/admin/system-diagnostic',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('audit:read'),
    async (_req, res) => {
      const supabase = getSupabaseAdmin();
      const supabaseConfigured = isSupabaseConfigured();

      let dbConnected = false;
      let ownerExists = false;
      let ownerCount = 0;
      let migrationApplied = false;
      let dbError: string | null = null;

      if (supabase) {
        try {
          const { count, error: countError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'owner');

          if (countError) {
            dbError = countError.message;
          } else {
            dbConnected = true;
            migrationApplied = true;
            ownerCount = count ?? 0;
            ownerExists = ownerCount > 0;
          }
        } catch (err) {
          dbError = err instanceof Error ? err.message : String(err);
        }
      }

      const bootstrapTokenConfigured = Boolean(process.env.EASI_MARK_BOOTSTRAP_TOKEN || '');
      const bootstrapActive = !ownerExists;

      res.json({
        supabaseConfigured,
        databaseConnected: dbConnected,
        migrationApplied,
        ownerProfileExists: ownerExists,
        ownerCount,
        clerkConfigured: isServerClerkConfigured(),
        portalCredentialReady: await isPortalAdminCredentialReady(),
        ownerEmailConfigured: getOwnerEmails().length > 0,
        bootstrap: {
          mechanismActive: bootstrapActive,
          tokenConfigured: bootstrapTokenConfigured,
        },
        databaseError: dbError,
        status: dbConnected && migrationApplied ? 'PASS' : 'IN_MEMORY_FALLBACK',
      });
    }
  );

  app.get('/api/config', (_req, res) => {
    res.json({
      clerkPublishableKey: isServerClerkConfigured() ? serverPublishableKey : null,
      paystackConfigured: isServerPaystackConfigured(),
      databaseConfigured: isSupabaseConfigured(),
    });
  });

  app.get(
    '/api/me',
    requireAuthenticatedSession,
    requirePermission('account:read'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const appAuth = req.appAuth!;
        const isPortalUser =
          appAuth.userId.startsWith('portal-') || appAuth.userId.startsWith('staff-');
        if (!serverClerkClient || isPortalUser) {
          res.json({
            identity: {
              userId: appAuth.userId,
              firstName: appAuth.fullName?.split(' ')[0] || null,
              lastName: appAuth.fullName?.split(' ').slice(1).join(' ') || null,
              fullName: appAuth.fullName,
              email: appAuth.verifiedEmail,
              imageUrl: null,
              orgId: appAuth.orgId,
            },
            authorization: {
              role: appAuth.policy.role,
              permissions: appAuth.policy.permissions,
              canAccessAdmin: appAuth.policy.permissions.includes('admin:access'),
              ownerInitialized: await isOwnerInitialized(),
            },
          });
          return;
        }
        const user = await serverClerkClient.users.getUser(appAuth.userId);
        const primaryEmail =
          user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
            ?.emailAddress ??
          user.emailAddresses[0]?.emailAddress ??
          appAuth.verifiedEmail ??
          null;

        res.json({
          identity: {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
            email: primaryEmail,
            imageUrl: user.imageUrl,
            orgId: appAuth.orgId,
          },
          authorization: {
            role: appAuth.policy.role,
            permissions: appAuth.policy.permissions,
            canAccessAdmin: appAuth.policy.permissions.includes('admin:access'),
            ownerInitialized: await isOwnerInitialized(),
          },
        });
      } catch (error) {
        console.error('Failed to retrieve user identity:', error);
        res.status(500).json({ error: 'Unable to retrieve authenticated user profile.' });
      }
    }
  );

  // Secure One-Time Atomic Initial Owner Bootstrap Endpoint
  app.post(
    '/api/admin/bootstrap-owner',
    requireAuthenticatedSession,
    async (req: AuthenticatedRequest, res) => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        res.status(503).json({ error: 'Supabase database is not configured.' });
        return;
      }

      const initialized = await isOwnerInitialized();
      if (initialized) {
        res.status(403).json({
          error: 'Owner provisioning has already been completed. Bootstrap is retired.',
        });
        return;
      }

      const tokenProvided = typeof req.body?.setupToken === 'string' ? req.body.setupToken.trim() : '';
      const expectedToken = (process.env.EASI_MARK_BOOTSTRAP_TOKEN || '').trim();

      if (!expectedToken) {
        res.status(503).json({ error: 'Initial owner bootstrap token is not configured on the server.' });
        return;
      }

      if (tokenProvided !== expectedToken) {
        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: req.appAuth!.userId,
          actorRole: req.appAuth!.policy.role,
          action: 'POST',
          target: '/api/admin/bootstrap-owner',
          outcome: 'denied',
          reason: 'invalid_bootstrap_token',
        });
        res.status(403).json({ error: 'Invalid or missing initial owner setup token.' });
        return;
      }

      const userId = req.appAuth!.userId;
      const email = req.appAuth!.verifiedEmail || `${userId}@clerk.user`;
      const fullName = req.appAuth!.fullName;

      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'owner',
        updated_at: new Date().toISOString(),
      });

      if (error) {
        res.status(500).json({ error: error.message || 'Failed to provision initial owner profile.' });
        return;
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: userId,
        actorRole: 'owner',
        action: 'POST',
        target: '/api/admin/bootstrap-owner',
        outcome: 'allowed',
        reason: 'initial_owner_provisioned',
      });

      res.json({
        success: true,
        message: 'Initial owner profile provisioned successfully. Bootstrap mechanism is now retired.',
      });
    }
  );

  app.get(
    '/api/cart',
    requireAuthenticatedSession,
    requirePermission('cart:read'),
    (req: AuthenticatedRequest, res) => {
      const userId = req.appAuth!.userId;
      const record = userCarts.get(userId);

      if (record && !isResourceOwner(userId, record.ownerId)) {
        res.status(403).json({ error: 'Forbidden: cannot access another user cart.' });
        return;
      }

      res.json({
        items: record?.items ?? [],
        updatedAt: record?.updatedAt ?? null,
      });
    }
  );

  app.put(
    '/api/cart',
    requireAuthenticatedSession,
    requirePermission('cart:write'),
    (req: AuthenticatedRequest, res) => {
      const userId = req.appAuth!.userId;
      const sanitized = sanitizeCartItems(req.body?.items);

      if (!sanitized) {
        res.status(400).json({ error: 'Invalid cart payload or meal quantity.' });
        return;
      }

      const existing = userCarts.get(userId);
      if (existing && !isResourceOwner(userId, existing.ownerId)) {
        res.status(403).json({ error: 'Forbidden: cannot modify another user cart.' });
        return;
      }

      const updated: UserCartRecord = {
        ownerId: userId,
        items: sanitized,
        updatedAt: new Date().toISOString(),
      };
      userCarts.set(userId, updated);

      res.json({
        items: updated.items,
        updatedAt: updated.updatedAt,
      });
    }
  );

  app.delete(
    '/api/cart',
    requireAuthenticatedSession,
    requirePermission('cart:write'),
    (req: AuthenticatedRequest, res) => {
      const userId = req.appAuth!.userId;
      userCarts.delete(userId);
      res.json({ items: [], updatedAt: new Date().toISOString() });
    }
  );

  app.post(
    '/api/payments/paystack/initialize',
    requireAuthenticatedSession,
    requirePermission('cart:write'),
    async (req: AuthenticatedRequest, res) => {
      if (!isServerPaystackConfigured()) {
        res.status(503).json({
          error:
            'Paystack is not configured on the server yet. Add PAYSTACK_SECRET_KEY to your environment variables.',
        });
        return;
      }

      try {
        await syncCatalogWithDatabase();
        const userId = req.appAuth!.userId;
        let cartItems: StoredCartEntry[] | undefined;

        if (req.body?.items !== undefined) {
          const sanitized = sanitizeCartItems(req.body.items);
          if (!sanitized) {
            res.status(400).json({ error: 'Invalid cart items supplied for checkout.' });
            return;
          }
          cartItems = sanitized;
          userCarts.set(userId, {
            ownerId: userId,
            items: sanitized,
            updatedAt: new Date().toISOString(),
          });
        } else {
          cartItems = userCarts.get(userId)?.items;
        }

        if (!cartItems || cartItems.length === 0) {
          res.status(400).json({ error: 'Your cart is empty.' });
          return;
        }

        const built = buildLineItems(cartItems);
        if (!built) {
          res.status(400).json({ error: 'Unknown meal or unpriced item in cart.' });
          return;
        }

        const { lineItems, totalNaira, expectedAmountKobo } = built;
        if (expectedAmountKobo <= 0) {
          res.status(400).json({
            error:
              'Online Paystack checkout requires confirmed menu prices. Please order via WhatsApp or call 0807 144 1727 to confirm current prices.',
          });
          return;
        }

        let primaryEmail = req.appAuth!.verifiedEmail;
        const isPortalUser = userId.startsWith('portal-') || userId.startsWith('staff-');
        if (!primaryEmail && serverClerkClient && !isPortalUser) {
          try {
            const user = await serverClerkClient.users.getUser(userId);
            primaryEmail =
              user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
                ?.emailAddress ??
              user.emailAddresses[0]?.emailAddress ??
              null;
          } catch (clerkErr) {
            console.warn('Clerk email lookup fallback:', clerkErr);
          }
        }

        if (!primaryEmail) {
          res.status(400).json({
            error: 'An email address on your account is required for Paystack checkout.',
          });
          return;
        }

        const reference = `EMK-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const callbackUrl = resolveCallbackUrl(req);
        const paystackSecret = getPaystackSecretKey();
        const orderSig = signOrderMetadata(paystackSecret, {
          reference,
          userId,
          expectedAmountKobo,
          items: cartItems,
        });

        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: primaryEmail,
            amount: expectedAmountKobo,
            currency: 'NGN',
            reference,
            ...(callbackUrl ? { callback_url: callbackUrl } : {}),
            metadata: {
              userId,
              expectedAmountKobo,
              items: cartItems,
              orderSig,
              itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
            },
          }),
        });

        const paystackRaw = await paystackRes.text();
        let paystackJson: {
          status?: boolean;
          message?: string;
          data?: {
            authorization_url?: string;
            access_code?: string;
            reference?: string;
          };
        } = {};
        try {
          paystackJson = JSON.parse(paystackRaw);
        } catch {
          res.status(502).json({
            error: 'Paystack returned an unexpected non-JSON response during initialization.',
          });
          return;
        }

        if (!paystackRes.ok || !paystackJson.status || !paystackJson.data?.access_code) {
          res.status(502).json({
            error: paystackJson.message || 'Failed to initialize Paystack transaction.',
          });
          return;
        }

        const orderRecord: OrderRecord = {
          reference,
          ownerId: userId,
          email: primaryEmail,
          items: lineItems,
          totalNaira,
          expectedAmountKobo,
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: new Date().toISOString(),
        };
        ordersByReference.set(reference, orderRecord);

        const supabase = getSupabaseAdmin();
        if (supabase) {
          const mappedRole =
            req.appAuth!.policy.role === 'manager' ? 'owner' : req.appAuth!.policy.role;
          const { error: profileError } = await supabase.from('profiles').upsert(
            {
              id: userId,
              email: primaryEmail,
              full_name: req.appAuth!.fullName,
              role: mappedRole,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
          if (profileError) {
            console.error('Supabase profile upsert warning:', profileError);
          }

          const { error: orderError } = await supabase.from('orders').upsert({
            reference,
            owner_id: userId,
            email: primaryEmail,
            total_naira: totalNaira,
            expected_amount_kobo: expectedAmountKobo,
            status: 'pending',
            payment_status: 'pending',
            channel: 'paystack',
          });
          if (orderError) {
            console.error('Supabase order insert failed:', orderError);
            res.status(500).json({ error: 'Unable to record order before payment.' });
            return;
          }

          for (const item of lineItems) {
            const catalogMeal = getCatalogMeal(item.mealId);
            if (catalogMeal) {
              await ensureMealInSupabase(supabase, catalogMeal);
            }
            const { error: itemError } = await supabase.from('order_items').insert({
              order_reference: reference,
              meal_id: item.mealId,
              name: item.name,
              unit_price_naira: item.unitPriceNaira,
              quantity: item.quantity,
              line_total_naira: item.lineTotalNaira,
            });
            if (itemError) {
              console.error('Supabase order_items insert failed:', itemError);
            }
          }
        }

        res.json({
          reference,
          access_code: paystackJson.data.access_code,
          authorization_url: paystackJson.data.authorization_url,
          amountNaira: totalNaira,
          amountKobo: expectedAmountKobo,
        });
      } catch (error) {
        console.error('Paystack initialization failed:', error);
        res.status(500).json({ error: 'Unable to initialize payment right now.' });
      }
    }
  );

  app.get(
    '/api/payments/paystack/verify/:reference',
    requireAuthenticatedSession,
    requirePermission('cart:write'),
    async (req: AuthenticatedRequest, res) => {
      if (!isServerPaystackConfigured()) {
        res.status(503).json({
          error: 'Paystack is not configured on the server yet.',
        });
        return;
      }

      const reference = req.params.reference;
      if (!reference || !/^(EMK|MK)-[A-Za-z0-9_-]{6,64}$/.test(reference)) {
        res.status(400).json({ error: 'Invalid payment reference.' });
        return;
      }

      const userId = req.appAuth!.userId;
      let existingOrder = ordersByReference.get(reference);

      const supabase = getSupabaseAdmin();
      if (!existingOrder && supabase) {
        const { data: dbOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('reference', reference)
          .maybeSingle();

        if (dbOrder) {
          const { data: dbItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_reference', reference);

          const lineItems: OrderLineItem[] = (dbItems || []).map((item) => ({
            mealId: item.meal_id,
            name: item.name,
            unitPriceNaira: item.unit_price_naira,
            quantity: item.quantity,
            lineTotalNaira: item.line_total_naira,
          }));

          existingOrder = {
            reference: dbOrder.reference,
            ownerId: dbOrder.owner_id,
            email: dbOrder.email,
            items: lineItems,
            totalNaira: dbOrder.total_naira,
            expectedAmountKobo: dbOrder.expected_amount_kobo,
            status: dbOrder.status,
            paymentStatus: dbOrder.payment_status,
            channel: dbOrder.channel,
            paidAt: dbOrder.paid_at,
            createdAt: dbOrder.created_at,
          };
          ordersByReference.set(reference, existingOrder);
        }
      }

      if (existingOrder && !isResourceOwner(userId, existingOrder.ownerId)) {
        res.status(403).json({ error: 'Forbidden: cannot verify another user order.' });
        return;
      }

      if (existingOrder?.paymentStatus === 'paid') {
        res.json({
          verified: true,
          receipt: {
            reference: existingOrder.reference,
            totalNaira: existingOrder.totalNaira,
            items: existingOrder.items,
            paidAt: existingOrder.paidAt,
            channel: existingOrder.channel ?? 'card',
          },
        });
        return;
      }

      try {
        await syncCatalogWithDatabase();
        const paystackSecret = getPaystackSecretKey();
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: {
              Authorization: `Bearer ${paystackSecret}`,
            },
          }
        );

        const verifyRaw = await verifyRes.text();
        let verifyJson: {
          status?: boolean;
          message?: string;
          data?: {
            status?: string;
            currency?: string;
            amount?: number;
            reference?: string;
            paid_at?: string;
            channel?: string;
            customer?: {
              email?: string;
            };
            metadata?: {
              userId?: string;
              expectedAmountKobo?: number;
              items?: unknown;
              orderSig?: string;
            };
          };
        } = {};
        try {
          verifyJson = JSON.parse(verifyRaw);
        } catch {
          res.status(502).json({
            verified: false,
            error: 'Paystack returned an unexpected non-JSON response during verification.',
          });
          return;
        }

        const tx = verifyJson.data;
        if (!verifyRes.ok || !verifyJson.status || !tx) {
          res.status(400).json({
            verified: false,
            error: verifyJson.message || 'Unable to verify payment with Paystack.',
          });
          return;
        }

        let order = existingOrder;
        let reconstructedFromMetadata = false;
        if (!order) {
          const meta = tx.metadata;
          const metaItems = sanitizeCartItems(meta?.items);
          const metaAmountKobo = Number(meta?.expectedAmountKobo);
          const metaUserId = typeof meta?.userId === 'string' ? meta.userId : '';
          const metaSig = typeof meta?.orderSig === 'string' ? meta.orderSig : '';

          if (!metaUserId || !metaItems || !Number.isFinite(metaAmountKobo)) {
            res.status(404).json({ error: 'Order reference not found or missing metadata.' });
            return;
          }

          if (!isResourceOwner(userId, metaUserId)) {
            res.status(403).json({ error: 'Forbidden: cannot verify another user order.' });
            return;
          }

          if (
            !verifyOrderMetadataSignature(
              paystackSecret,
              {
                reference,
                userId: metaUserId,
                expectedAmountKobo: metaAmountKobo,
                items: metaItems,
              },
              metaSig
            )
          ) {
            res.status(403).json({ error: 'Order signature verification failed.' });
            return;
          }

          const rebuilt = buildLineItems(metaItems);
          if (!rebuilt || rebuilt.expectedAmountKobo !== metaAmountKobo) {
            res.status(400).json({ error: 'Order amount integrity check failed.' });
            return;
          }

          order = {
            reference,
            ownerId: metaUserId,
            email: tx.customer?.email || req.appAuth!.verifiedEmail || '',
            items: rebuilt.lineItems,
            totalNaira: rebuilt.totalNaira,
            expectedAmountKobo: rebuilt.expectedAmountKobo,
            status: 'pending',
            paymentStatus: 'pending',
            createdAt: new Date().toISOString(),
          };
          ordersByReference.set(reference, order);
          reconstructedFromMetadata = true;
        }

        if (
          tx.status !== 'success' ||
          tx.currency !== 'NGN' ||
          Number(tx.amount) < order.expectedAmountKobo ||
          tx.reference !== reference
        ) {
          res.status(400).json({
            verified: false,
            error:
              verifyJson.message || 'Payment has not been completed or amount did not match.',
          });
          return;
        }

        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.paidAt = tx.paid_at || new Date().toISOString();
        order.channel = tx.channel || 'card';
        userCarts.delete(userId);

        await pushNotification({
          title: 'New Paid Order',
          message: `Order ${reference} paid successfully (${order.totalNaira} NGN).`,
          type: 'order',
        });

        if (supabase) {
          if (reconstructedFromMetadata) {
            const mappedRole =
              req.appAuth!.policy.role === 'manager' ? 'owner' : req.appAuth!.policy.role;
            await supabase.from('profiles').upsert(
              {
                id: order.ownerId,
                email: order.email || `${order.ownerId}@yomatkitchen.ng`,
                full_name: req.appAuth!.fullName,
                role: mappedRole,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id', ignoreDuplicates: true }
            );
          }

          const { error: orderUpdateError } = await supabase.from('orders').upsert({
            reference: order.reference,
            owner_id: order.ownerId,
            email: order.email || req.appAuth!.verifiedEmail || `${order.ownerId}@yomatkitchen.ng`,
            total_naira: order.totalNaira,
            expected_amount_kobo: order.expectedAmountKobo,
            status: 'confirmed',
            payment_status: 'paid',
            channel: order.channel,
            paid_at: order.paidAt,
            updated_at: new Date().toISOString(),
          });
          if (orderUpdateError) {
            console.error('Supabase paid order upsert failed:', orderUpdateError);
          }

          if (reconstructedFromMetadata) {
            const { count: existingItemsCount } = await supabase
              .from('order_items')
              .select('*', { count: 'exact', head: true })
              .eq('order_reference', reference);
            if ((existingItemsCount ?? 0) === 0) {
              for (const item of order.items) {
                const catalogMeal = getCatalogMeal(item.mealId);
                if (catalogMeal) {
                  await ensureMealInSupabase(supabase, catalogMeal);
                }
                await supabase.from('order_items').insert({
                  order_reference: reference,
                  meal_id: item.mealId,
                  name: item.name,
                  unit_price_naira: item.unitPriceNaira,
                  quantity: item.quantity,
                  line_total_naira: item.lineTotalNaira,
                });
              }
            }
          }

          const { error: paymentUpsertError } = await supabase.from('payments').upsert({
            reference,
            provider: 'paystack',
            amount_kobo: tx.amount,
            currency: tx.currency,
            status: tx.status,
            raw_response: tx,
          });
          if (paymentUpsertError) {
            console.error('Supabase payment upsert failed:', paymentUpsertError);
          }
        }

        res.json({
          verified: true,
          receipt: {
            reference: order.reference,
            totalNaira: order.totalNaira,
            items: order.items,
            paidAt: order.paidAt,
            channel: order.channel,
          },
        });
      } catch (error) {
        console.error('Paystack verification failed:', error);
        res.status(500).json({ error: 'Unable to verify payment with Paystack.' });
      }
    }
  );

  // ==========================================
  // YOMAT KITCHEN ADVANCED ADMIN API (STRICT RBAC)
  // ==========================================

  app.get(
    '/api/admin/session',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('admin:access'),
    (req: AuthenticatedRequest, res) => {
      const appAuth = req.appAuth!;
      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: appAuth.userId,
        actorRole: appAuth.policy.role,
        action: 'GET',
        target: '/api/admin/session',
        outcome: 'allowed',
      });

      res.json({
        user: {
          userId: appAuth.userId,
          fullName: appAuth.fullName,
          email: appAuth.verifiedEmail,
        },
        role: appAuth.policy.role,
        permissions: appAuth.policy.permissions,
        provisioningSource: appAuth.policy.source,
        databaseConnected: isSupabaseConfigured(),
      });
    }
  );

  // 1. Overview / Dashboard Metrics (Staff sees order counts; Manager sees revenue & sales trends)
  app.get(
    '/api/admin/overview',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('admin:access'),
    async (req: AuthenticatedRequest, res) => {
      const canSeeFinancials = isManagerRole(req.appAuth?.policy.role);
      const supabase = getSupabaseAdmin();
      let totalOrdersToday = 0;
      let revenueToday: number | null = canSeeFinancials ? 0 : null;
      let pendingOrders = 0;
      let completedOrders = 0;
      let cancelledOrders = 0;
      let recentOrders: unknown[] = [];
      let popularMeals: unknown[] = [];
      const cateringList = canSeeFinancials ? await loadCateringList() : [];

      if (supabase) {
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (orders) {
          recentOrders = orders.slice(0, 8).map((ord) => ({
            ...ord,
            total_naira: canSeeFinancials ? ord.total_naira : null,
          }));
          for (const ord of orders) {
            if (ord.payment_status === 'paid') {
              if (canSeeFinancials && revenueToday !== null) {
                revenueToday += ord.total_naira;
              }
              totalOrdersToday++;
            }
            if (ord.status === 'pending') pendingOrders++;
            if (ord.status === 'completed') completedOrders++;
            if (ord.status === 'cancelled') cancelledOrders++;
          }
        }

        if (canSeeFinancials) {
          const { data: items } = await supabase.from('order_items').select('*');
          if (items) {
            const counts: Record<string, { name: string; count: number; revenue: number }> = {};
            for (const item of items) {
              if (!counts[item.meal_id]) {
                counts[item.meal_id] = { name: item.name, count: 0, revenue: 0 };
              }
              counts[item.meal_id].count += item.quantity;
              counts[item.meal_id].revenue += item.line_total_naira;
            }
            popularMeals = Object.entries(counts)
              .map(([mealId, stats]) => ({ mealId, ...stats }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
          }
        }
      } else {
        const localOrders = Array.from(ordersByReference.values()).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        );
        recentOrders = localOrders.slice(0, 8).map((ord) => ({
          reference: ord.reference,
          email: ord.email,
          total_naira: canSeeFinancials ? ord.totalNaira : null,
          status: ord.status,
          payment_status: ord.paymentStatus,
          created_at: ord.createdAt,
        }));
        for (const ord of localOrders) {
          if (ord.paymentStatus === 'paid') {
            if (canSeeFinancials && revenueToday !== null) {
              revenueToday += ord.totalNaira;
            }
            totalOrdersToday++;
          }
          if (ord.status === 'pending') pendingOrders++;
          if (ord.status === 'completed') completedOrders++;
          if (ord.status === 'cancelled') cancelledOrders++;
        }
        if (canSeeFinancials) {
          const counts: Record<string, { name: string; count: number; revenue: number }> = {};
          for (const ord of localOrders) {
            for (const item of ord.items) {
              if (!counts[item.mealId]) {
                counts[item.mealId] = { name: item.name, count: 0, revenue: 0 };
              }
              counts[item.mealId].count += item.quantity;
              counts[item.mealId].revenue += item.lineTotalNaira;
            }
          }
          popularMeals = Object.entries(counts)
            .map(([mealId, stats]) => ({ mealId, ...stats }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        }
      }

      res.json({
        metrics: {
          totalOrdersToday,
          revenueToday,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          openCateringCount: canSeeFinancials
            ? cateringList.filter((c) => c.status === 'new' || c.status === 'quoted').length
            : null,
        },
        recentOrders,
        popularMeals,
        recentActivity: canSeeFinancials ? recentAuditLogs.slice(0, 8) : [],
        databaseConnected: isSupabaseConfigured(),
        paystackConfigured: isServerPaystackConfigured(),
      });
    }
  );

  // 2. Order Management (Staff + Manager)
  app.get(
    '/api/admin/orders',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('orders:read'),
    async (req: AuthenticatedRequest, res) => {
      const supabase = getSupabaseAdmin();
      const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
      if (!supabase) {
        let localOrders = Array.from(ordersByReference.values())
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((ord) => ({
            reference: ord.reference,
            owner_id: ord.ownerId,
            email: ord.email,
            total_naira: ord.totalNaira,
            expected_amount_kobo: ord.expectedAmountKobo,
            status: ord.status,
            payment_status: ord.paymentStatus,
            channel: ord.channel,
            paid_at: ord.paidAt,
            created_at: ord.createdAt,
            order_items: ord.items.map((i) => ({
              meal_id: i.mealId,
              name: i.name,
              unit_price_naira: i.unitPriceNaira,
              quantity: i.quantity,
              line_total_naira: i.lineTotalNaira,
            })),
          }));
        if (statusFilter && statusFilter !== 'all') {
          localOrders = localOrders.filter((o) => o.status === statusFilter);
        }
        res.json({ orders: localOrders, databaseConnected: false });
        return;
      }

      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ orders: data || [], databaseConnected: true });
    }
  );

  app.post(
    '/api/admin/orders',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('orders:update'),
    async (req: AuthenticatedRequest, res) => {
      const body = req.body || {};
      const customerContact =
        typeof body.email === 'string' && body.email.trim()
          ? body.email.trim().slice(0, 120)
          : 'walkin@yomatkitchen.ng';
      const channel =
        typeof body.channel === 'string' && body.channel.trim()
          ? body.channel.trim().slice(0, 40)
          : 'whatsapp_phone';
      const requestedStatus = body.status;
      const allowedStatuses = new Set([
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'completed',
        'cancelled',
      ]);
      const status: OrderRecord['status'] = allowedStatuses.has(requestedStatus)
        ? requestedStatus
        : 'confirmed';

      // Staff cannot mark an order as paid manually; only Manager can record paid status
      const paymentStatus: OrderRecord['paymentStatus'] =
        body.paymentStatus === 'paid' && isManagerRole(req.appAuth?.policy.role)
          ? 'paid'
          : 'pending';

      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (rawItems.length === 0) {
        res.status(400).json({ error: 'Select at least one dish item for the order.' });
        return;
      }

      const lineItems: OrderLineItem[] = [];
      let totalNaira = 0;

      for (const entry of rawItems) {
        const mealId = typeof entry?.mealId === 'string' ? entry.mealId : '';
        const qty = Math.max(1, Math.min(99, Math.round(Number(entry?.quantity) || 1)));
        const meal = getCatalogMeal(mealId);
        if (!meal) continue;
        const unitPrice =
          meal.priceConfirmed && meal.priceNaira > 0
            ? meal.priceNaira
            : Math.max(0, Math.round(Number(entry?.unitPriceNaira) || 0));
        const lineTotal = unitPrice * qty;
        totalNaira += lineTotal;
        lineItems.push({
          mealId: meal.id,
          name: meal.name,
          unitPriceNaira: unitPrice,
          quantity: qty,
          lineTotalNaira: lineTotal,
        });
      }

      if (lineItems.length === 0) {
        res.status(400).json({ error: 'No valid menu items provided for the order.' });
        return;
      }

      const reference = `YMK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const nowIso = new Date().toISOString();
      const orderRecord: OrderRecord = {
        reference,
        ownerId: `customer-${customerContact.replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'walkin'}`,
        email: customerContact,
        items: lineItems,
        totalNaira,
        expectedAmountKobo: totalNaira * 100,
        status,
        paymentStatus,
        channel,
        paidAt: paymentStatus === 'paid' ? nowIso : undefined,
        createdAt: nowIso,
      };
      ordersByReference.set(reference, orderRecord);

      const supabase = getSupabaseAdmin();
      if (supabase) {
        let effectiveOwnerId = orderRecord.ownerId;
        const { error: guestProfileError } = await supabase.from('profiles').upsert(
          {
            id: effectiveOwnerId,
            email: orderRecord.email,
            full_name: customerContact,
            role: 'customer',
            updated_at: nowIso,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (guestProfileError) {
          effectiveOwnerId = req.appAuth!.userId;
        }
        orderRecord.ownerId = effectiveOwnerId;

        const { error: orderErr } = await supabase.from('orders').upsert({
          reference: orderRecord.reference,
          owner_id: effectiveOwnerId,
          email: orderRecord.email,
          total_naira: orderRecord.totalNaira,
          expected_amount_kobo: orderRecord.expectedAmountKobo,
          status: orderRecord.status,
          payment_status: orderRecord.paymentStatus,
          channel: orderRecord.channel,
          paid_at: orderRecord.paidAt ?? null,
        });
        if (orderErr) {
          res.status(400).json({ error: orderErr.message || 'Failed to save order to database.' });
          return;
        }
        for (const item of lineItems) {
          const catalogMeal = getCatalogMeal(item.mealId);
          if (catalogMeal) {
            await ensureMealInSupabase(supabase, catalogMeal);
          }
          await supabase.from('order_items').insert({
            order_reference: reference,
            meal_id: item.mealId,
            name: item.name,
            unit_price_naira: item.unitPriceNaira,
            quantity: item.quantity,
            line_total_naira: item.lineTotalNaira,
          });
        }
      }

      await pushNotification({
        title: 'New Kitchen Order Recorded',
        message: `${reference} (${channel}) — ${lineItems.length} item(s) for ${customerContact}.`,
        type: 'order',
      });

      recordAuthAuditEvent({
        timestamp: nowIso,
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'POST',
        target: '/api/admin/orders',
        outcome: 'allowed',
        reason: `created_order:${reference}`,
      });

      res.status(201).json({ success: true, order: orderRecord });
    }
  );

  app.patch(
    '/api/admin/orders/:reference',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('orders:update'),
    async (req: AuthenticatedRequest, res) => {
      const reference = req.params.reference;
      const { status, paymentStatus } = req.body || {};
      const allowedStatuses = new Set([
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'completed',
        'cancelled',
      ]);

      if (status && !allowedStatuses.has(status)) {
        res.status(400).json({ error: 'Invalid order processing status.' });
        return;
      }

      // Staff cannot override payment status directly
      if (paymentStatus && !isManagerRole(req.appAuth?.policy.role)) {
        res.status(403).json({
          error: 'Forbidden: only the restaurant manager can alter payment status.',
        });
        return;
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        const localOrd = ordersByReference.get(reference);
        if (!localOrd) {
          res.status(404).json({ error: 'Order not found.' });
          return;
        }
        if (status) localOrd.status = status;
        if (paymentStatus) {
          localOrd.paymentStatus = paymentStatus;
          if (paymentStatus === 'paid' && !localOrd.paidAt) {
            localOrd.paidAt = new Date().toISOString();
          }
        }

        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: req.appAuth!.userId,
          actorRole: req.appAuth!.policy.role,
          action: 'PATCH',
          target: `/api/admin/orders/${reference}`,
          outcome: 'allowed',
          reason: `status:${status || 'none'}`,
        });

        res.json({ success: true, order: localOrd });
        return;
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (status) updates.status = status;
      if (paymentStatus) {
        updates.payment_status = paymentStatus;
        if (paymentStatus === 'paid') {
          updates.paid_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('reference', reference)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message || 'Failed to update order.' });
        return;
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'PATCH',
        target: `/api/admin/orders/${reference}`,
        outcome: 'allowed',
        reason: `status:${status || 'none'},payment:${paymentStatus || 'none'}`,
      });

      res.json({ success: true, order: data });
    }
  );

  // 3. Menu Management & Proposed Pricing Review (Manager ONLY)
  app.get(
    '/api/admin/menu',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('menu:manage'),
    async (_req, res) => {
      const meals = await syncCatalogWithDatabase();
      res.json({
        menu: meals.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          short_description: m.shortDescription,
          full_description: m.fullDescription,
          price_naira: m.priceNaira,
          price_confirmed: m.priceConfirmed,
          image: m.image,
          is_available: m.isAvailable,
          is_featured: m.isFeatured,
        })),
        databaseConnected: isSupabaseConfigured(),
      });
    }
  );

  app.get(
    '/api/admin/pricing-proposals',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('pricing:approve'),
    async (_req, res) => {
      await syncCatalogWithDatabase();
      const proposals = DISH_PRICING_PROPOSALS.map((proposal) => {
        const current = liveMealCatalog.get(proposal.mealId);
        return {
          ...proposal,
          currentPublishedPriceNaira: current?.priceConfirmed ? current.priceNaira : null,
          isCurrentlyConfirmed: Boolean(current?.priceConfirmed && (current?.priceNaira ?? 0) > 0),
        };
      });
      res.json({ proposals });
    }
  );

  app.post(
    '/api/admin/pricing-proposals/approve',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('pricing:approve'),
    async (req: AuthenticatedRequest, res) => {
      const rawApprovals = req.body?.approvals;
      if (!Array.isArray(rawApprovals) || rawApprovals.length === 0) {
        res.status(400).json({ error: 'Select at least one dish price to approve.' });
        return;
      }

      const overwriteConfirmed = Boolean(req.body?.overwriteConfirmed);
      const updatedMeals: ServerMealInfo[] = [];
      const skippedConfirmed: string[] = [];
      const supabase = getSupabaseAdmin();

      for (const entry of rawApprovals) {
        const mealId = typeof entry?.mealId === 'string' ? entry.mealId : '';
        const approvedPriceNaira = Math.round(Number(entry?.priceNaira));
        const meal = liveMealCatalog.get(mealId);
        if (!meal || !Number.isFinite(approvedPriceNaira) || approvedPriceNaira < 100) {
          continue;
        }

        if (meal.priceConfirmed && meal.priceNaira > 0 && !overwriteConfirmed && !entry?.explicitOverwrite) {
          skippedConfirmed.push(meal.name);
          continue;
        }

        const updated: ServerMealInfo = {
          ...meal,
          priceNaira: approvedPriceNaira,
          priceConfirmed: true,
        };
        liveMealCatalog.set(mealId, updated);
        updatedMeals.push(updated);

        if (supabase) {
          await ensureCategoryInSupabase(supabase, updated.category);
          await supabase.from('menu_items').upsert({
            id: updated.id,
            name: updated.name,
            category: updated.category,
            short_description: updated.shortDescription,
            full_description: updated.fullDescription,
            ingredients_highlight: [],
            prep_style: updated.prepStyle,
            price_naira: updated.priceNaira,
            image: updated.image,
            is_available: updated.isAvailable,
            is_featured: updated.isFeatured,
            updated_at: new Date().toISOString(),
          });
        }
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'POST',
        target: '/api/admin/pricing-proposals/approve',
        outcome: 'allowed',
        reason: `approved_prices:${updatedMeals.map((m) => `${m.id}=${m.priceNaira}`).join(',')}`,
      });

      if (updatedMeals.length > 0) {
        await pushNotification({
          title: 'Menu Prices Published',
          message: `Approved ${updatedMeals.length} menu price(s) onto Our Menu.`,
          type: 'menu',
        });
      }

      res.json({
        success: true,
        approvedCount: updatedMeals.length,
        skippedConfirmed,
      });
    }
  );

  app.post(
    '/api/admin/menu',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('menu:manage'),
    async (req: AuthenticatedRequest, res) => {
      const body = req.body || {};
      const id =
        typeof body.id === 'string' && body.id.trim()
          ? body.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
          : `meal-${Date.now()}`;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const category =
        typeof body.category === 'string' && body.category.trim()
          ? body.category.trim().slice(0, 60)
          : 'Rice Dishes';
      const shortDescription =
        typeof (body.shortDescription ?? body.short_description) === 'string'
          ? (body.shortDescription ?? body.short_description).trim()
          : '';
      const fullDescription =
        typeof (body.fullDescription ?? body.full_description) === 'string'
          ? (body.fullDescription ?? body.full_description).trim() || shortDescription
          : shortDescription;
      const priceNaira = Math.max(0, Math.round(Number(body.priceNaira ?? body.price_naira ?? 0)));
      const rawImage =
        typeof body.image === 'string' && isSafeImagePath(body.image)
          ? body.image.trim()
          : '/src/assets/images/dish_jollof_chicken.jpg';
      const prepStyle = body.prepStyle || body.prep_style || 'Kitchen Specialty';
      const isAvailable = body.isAvailable ?? body.is_available ?? true;
      const isFeatured = body.isFeatured ?? body.is_featured ?? false;

      if (!name) {
        res.status(400).json({ error: 'Dish name and category are required.' });
        return;
      }

      const newMeal: ServerMealInfo = {
        id,
        name,
        category,
        shortDescription: shortDescription || `${name} served at Yomat Kitchen.`,
        fullDescription: fullDescription || `${name} prepared fresh at Yomat Kitchen in Uselu, Benin City.`,
        prepStyle,
        priceNaira,
        priceConfirmed: priceNaira > 0,
        image: rawImage,
        imageAlt: name,
        isAvailable: Boolean(isAvailable),
        isFeatured: Boolean(isFeatured),
      };
      liveMealCatalog.set(id, newMeal);

      const supabase = getSupabaseAdmin();
      if (supabase) {
        await ensureCategoryInSupabase(supabase, newMeal.category);
        const { error } = await supabase.from('menu_items').upsert({
          id: newMeal.id,
          name: newMeal.name,
          category: newMeal.category,
          short_description: newMeal.shortDescription,
          full_description: newMeal.fullDescription,
          ingredients_highlight: [],
          prep_style: newMeal.prepStyle,
          price_naira: newMeal.priceNaira,
          image: newMeal.image,
          is_available: newMeal.isAvailable,
          is_featured: newMeal.isFeatured,
        });
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'POST',
        target: '/api/admin/menu',
        outcome: 'allowed',
        reason: `created_meal:${id}`,
      });

      res.json({ success: true, meal: newMeal });
    }
  );

  app.put(
    '/api/admin/menu/:id',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('menu:manage'),
    async (req: AuthenticatedRequest, res) => {
      const mealId = req.params.id;
      const existing = liveMealCatalog.get(mealId);
      const body = req.body || {};

      if (body.image !== undefined && !isSafeImagePath(String(body.image))) {
        res.status(400).json({ error: 'Invalid or unsafe image URL.' });
        return;
      }

      const nextPrice =
        body.priceNaira !== undefined ? Math.max(0, Math.round(Number(body.priceNaira))) : existing?.priceNaira ?? 0;

      if (existing) {
        const updated: ServerMealInfo = {
          ...existing,
          name: body.name !== undefined ? String(body.name).trim() : existing.name,
          category:
            typeof body.category === 'string' && body.category.trim()
              ? body.category.trim().slice(0, 60)
              : existing.category,
          shortDescription:
            body.shortDescription !== undefined
              ? String(body.shortDescription)
              : existing.shortDescription,
          fullDescription:
            body.fullDescription !== undefined
              ? String(body.fullDescription)
              : existing.fullDescription,
          priceNaira: nextPrice,
          priceConfirmed: nextPrice > 0,
          image: body.image !== undefined ? String(body.image).trim() : existing.image,
          isAvailable:
            body.isAvailable !== undefined ? Boolean(body.isAvailable) : existing.isAvailable,
          isFeatured:
            body.isFeatured !== undefined ? Boolean(body.isFeatured) : existing.isFeatured,
        };
        liveMealCatalog.set(mealId, updated);
      }

      const supabase = getSupabaseAdmin();
      if (supabase) {
        const current = liveMealCatalog.get(mealId);
        if (current) {
          await ensureCategoryInSupabase(supabase, current.category);
        }
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          ...(current
            ? {
                name: current.name,
                category: current.category,
                short_description: current.shortDescription,
                full_description: current.fullDescription,
                prep_style: current.prepStyle,
                price_naira: current.priceNaira,
                image: current.image,
                is_available: current.isAvailable,
                is_featured: current.isFeatured,
              }
            : {}),
        };

        const { error } = await supabase.from('menu_items').upsert({
          id: mealId,
          ...updates,
        });

        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'PUT',
        target: `/api/admin/menu/${mealId}`,
        outcome: 'allowed',
        reason: `updated_meal:${mealId},price:${nextPrice}`,
      });

      res.json({ success: true, meal: liveMealCatalog.get(mealId) });
    }
  );

  app.delete(
    '/api/admin/menu/:id',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('menu:manage'),
    async (req: AuthenticatedRequest, res) => {
      const mealId = req.params.id;
      const isCoreMeal = INITIAL_SERVER_MEALS.some((m) => m.id === mealId);
      if (isCoreMeal) {
        res.status(400).json({
          error:
            'Core Yomat Kitchen menu dishes cannot be permanently deleted; mark the dish unavailable instead.',
        });
        return;
      }

      liveMealCatalog.delete(mealId);
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error } = await supabase.from('menu_items').delete().eq('id', mealId);
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'DELETE',
        target: `/api/admin/menu/${mealId}`,
        outcome: 'allowed',
      });

      res.json({ success: true });
    }
  );

  // 4. Category Management (Manager ONLY)
  app.get(
    '/api/admin/categories',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('categories:manage'),
    async (_req, res) => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        res.json({ categories: liveCategories, databaseConnected: false });
        return;
      }
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      res.json({
        categories: Array.isArray(data) && data.length > 0 ? data : liveCategories,
        databaseConnected: true,
      });
    }
  );

  app.post(
    '/api/admin/categories',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('categories:manage'),
    async (req: AuthenticatedRequest, res) => {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const image = req.body?.image || null;

      if (!name || !id) {
        res.status(400).json({ error: 'Category name is required.' });
        return;
      }

      if (liveCategories.some((c) => c.id === id || c.name.toLowerCase() === name.toLowerCase())) {
        res.status(400).json({ error: `Category "${name}" already exists.` });
        return;
      }

      const created = { id, name, sort_order: liveCategories.length + 1 };
      liveCategories.push(created);

      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error } = await supabase.from('categories').insert({ id, name, image });
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'POST',
        target: '/api/admin/categories',
        outcome: 'allowed',
        reason: `created_category:${name}`,
      });

      res.status(201).json({ success: true, category: created });
    }
  );

  app.delete(
    '/api/admin/categories/:id',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('categories:manage'),
    async (req: AuthenticatedRequest, res) => {
      const catId = req.params.id;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: category } = await supabase
          .from('categories')
          .select('name')
          .eq('id', catId)
          .maybeSingle();

        if (category) {
          const { count } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact', head: true })
            .eq('category', category.name);

          if ((count ?? 0) > 0) {
            res.status(400).json({
              error: `Cannot delete category "${category.name}" because it still contains ${count} menu items.`,
            });
            return;
          }
        }

        const { error } = await supabase.from('categories').delete().eq('id', catId);
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
      } else {
        const target = liveCategories.find((c) => c.id === catId);
        if (!target) {
          res.status(404).json({ error: 'Category not found.' });
          return;
        }
        const usedCount = Array.from(liveMealCatalog.values()).filter(
          (m) => m.category === target.name
        ).length;
        if (usedCount > 0) {
          res.status(400).json({
            error: `Cannot delete category "${target.name}" because it still contains ${usedCount} menu item(s).`,
          });
          return;
        }
      }

      const idx = liveCategories.findIndex((c) => c.id === catId);
      if (idx !== -1) liveCategories.splice(idx, 1);

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'DELETE',
        target: `/api/admin/categories/${catId}`,
        outcome: 'allowed',
      });

      res.json({ success: true });
    }
  );

  // 4B. Catering Enquiries Management (Manager ONLY)
  app.get(
    '/api/admin/catering',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('catering:manage'),
    async (_req, res) => {
      const enquiries = await loadCateringList();
      res.json({ enquiries });
    }
  );

  app.post(
    '/api/admin/catering',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('catering:manage'),
    async (req: AuthenticatedRequest, res) => {
      const body = req.body || {};
      const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const eventType = typeof body.eventType === 'string' ? body.eventType.trim() : 'Event Catering';
      const eventDate = typeof body.eventDate === 'string' ? body.eventDate.trim() : '';
      const guestCount = Math.max(1, Math.min(5000, Number(body.guestCount) || 20));
      const requestedDishes =
        typeof body.requestedDishes === 'string' ? body.requestedDishes.trim() : '';
      const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

      if (!clientName || !phone) {
        res.status(400).json({ error: 'Client name and phone number are required.' });
        return;
      }

      const existing = await loadCateringList();
      const created: CateringEnquiry = {
        id: `cat-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        clientName,
        phone,
        email,
        eventType,
        eventDate,
        guestCount,
        requestedDishes,
        notes,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveCateringList([created, ...existing]);

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'POST',
        target: '/api/admin/catering',
        outcome: 'allowed',
        reason: `created_catering:${created.id}`,
      });

      res.status(201).json({ success: true, enquiry: created });
    }
  );

  app.patch(
    '/api/admin/catering/:id',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('catering:manage'),
    async (req: AuthenticatedRequest, res) => {
      const id = req.params.id;
      const status = req.body?.status;
      const allowed = new Set(['new', 'quoted', 'confirmed', 'completed', 'cancelled']);
      if (!allowed.has(status)) {
        res.status(400).json({ error: 'Invalid catering enquiry status.' });
        return;
      }

      const list = await loadCateringList();
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Catering enquiry not found.' });
        return;
      }

      list[idx] = { ...list[idx], status, updatedAt: new Date().toISOString() };
      await saveCateringList(list);

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'PATCH',
        target: `/api/admin/catering/${id}`,
        outcome: 'allowed',
        reason: `status:${status}`,
      });

      res.json({ success: true, enquiry: list[idx] });
    }
  );

  app.delete(
    '/api/admin/catering/:id',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('catering:manage'),
    async (req: AuthenticatedRequest, res) => {
      const id = req.params.id;
      const list = await loadCateringList();
      const filtered = list.filter((c) => c.id !== id);
      await saveCateringList(filtered);
      res.json({ success: true });
    }
  );

  // 5. Customer Management (Manager ONLY)
  app.get(
    '/api/admin/customers',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('customers:read'),
    async (_req, res) => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        const customerMap: Record<string, unknown> = {};
        for (const ord of ordersByReference.values()) {
          if (!customerMap[ord.ownerId]) {
            customerMap[ord.ownerId] = {
              userId: ord.ownerId,
              fullName: 'Guest Customer',
              email: ord.email,
              role: 'customer',
              createdAt: ord.createdAt,
              orderCount: 0,
              totalSpent: 0,
              lastOrderAt: null,
            };
          }
          const cust = customerMap[ord.ownerId] as {
            orderCount: number;
            totalSpent: number;
            lastOrderAt: string | null;
          };
          cust.orderCount++;
          if (ord.paymentStatus === 'paid') cust.totalSpent += ord.totalNaira;
          if (!cust.lastOrderAt || ord.createdAt > cust.lastOrderAt) cust.lastOrderAt = ord.createdAt;
        }
        res.json({ customers: Object.values(customerMap), databaseConnected: false });
        return;
      }

      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: orders } = await supabase.from('orders').select('*');

      const customerMap: Record<string, unknown> = {};
      for (const p of profiles || []) {
        customerMap[p.id] = {
          userId: p.id,
          fullName: p.full_name,
          email: p.email,
          role: p.role,
          createdAt: p.created_at,
          orderCount: 0,
          totalSpent: 0,
          lastOrderAt: null,
        };
      }

      for (const ord of orders || []) {
        if (!customerMap[ord.owner_id]) {
          customerMap[ord.owner_id] = {
            userId: ord.owner_id,
            fullName: 'Guest Customer',
            email: ord.email,
            role: 'customer',
            createdAt: ord.created_at,
            orderCount: 0,
            totalSpent: 0,
            lastOrderAt: null,
          };
        }
        const cust = customerMap[ord.owner_id] as {
          orderCount: number;
          totalSpent: number;
          lastOrderAt: string | null;
        };
        cust.orderCount++;
        if (ord.payment_status === 'paid') {
          cust.totalSpent += ord.total_naira;
        }
        if (!cust.lastOrderAt || ord.created_at > cust.lastOrderAt) {
          cust.lastOrderAt = ord.created_at;
        }
      }

      res.json({ customers: Object.values(customerMap), databaseConnected: true });
    }
  );

  // 6. Analytics (Manager ONLY)
  app.get(
    '/api/admin/analytics',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('analytics:read'),
    async (_req, res) => {
      const supabase = getSupabaseAdmin();
      let totalPaidRevenue = 0;
      let totalPendingRevenue = 0;
      let totalOrders = 0;
      let paidOrders = 0;

      if (supabase) {
        const { data: orders } = await supabase.from('orders').select('*');
        if (orders) {
          totalOrders = orders.length;
          for (const ord of orders) {
            if (ord.payment_status === 'paid') {
              totalPaidRevenue += ord.total_naira;
              paidOrders++;
            } else {
              totalPendingRevenue += ord.total_naira;
            }
          }
        }
      } else {
        for (const ord of ordersByReference.values()) {
          totalOrders++;
          if (ord.paymentStatus === 'paid') {
            totalPaidRevenue += ord.totalNaira;
            paidOrders++;
          } else {
            totalPendingRevenue += ord.totalNaira;
          }
        }
      }

      const averageOrderValue = paidOrders > 0 ? Math.round(totalPaidRevenue / paidOrders) : 0;

      res.json({
        totalPaidRevenue,
        totalPendingRevenue,
        totalOrders,
        paidOrders,
        averageOrderValue,
        databaseConnected: isSupabaseConfigured(),
      });
    }
  );

  // 6B. Filtered Business Reports (Manager ONLY)
  app.get(
    '/api/admin/reports',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('reports:read'),
    async (req: AuthenticatedRequest, res) => {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '';
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '';
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const paymentStatus =
        typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus : 'all';

      const supabase = getSupabaseAdmin();
      let rows: Array<{
        reference: string;
        email: string;
        total_naira: number;
        status: string;
        payment_status: string;
        created_at: string;
      }> = [];

      if (supabase) {
        let query = supabase
          .from('orders')
          .select('reference, email, total_naira, status, payment_status, created_at')
          .order('created_at', { ascending: false });
        if (status && status !== 'all') query = query.eq('status', status);
        if (paymentStatus && paymentStatus !== 'all') {
          query = query.eq('payment_status', paymentStatus);
        }
        if (startDate) query = query.gte('created_at', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('created_at', `${endDate}T23:59:59Z`);

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        rows = data || [];
      } else {
        rows = Array.from(ordersByReference.values())
          .map((o) => ({
            reference: o.reference,
            email: o.email,
            total_naira: o.totalNaira,
            status: o.status,
            payment_status: o.paymentStatus,
            created_at: o.createdAt,
          }))
          .filter((o) => (status === 'all' ? true : o.status === status))
          .filter((o) => (paymentStatus === 'all' ? true : o.payment_status === paymentStatus))
          .filter((o) => (!startDate ? true : o.created_at >= `${startDate}T00:00:00Z`))
          .filter((o) => (!endDate ? true : o.created_at <= `${endDate}T23:59:59Z`));
      }

      const filteredRevenue = rows
        .filter((r) => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (Number(r.total_naira) || 0), 0);

      res.json({
        orders: rows,
        summary: {
          matchingOrders: rows.length,
          filteredPaidRevenue: filteredRevenue,
        },
        databaseConnected: isSupabaseConfigured(),
      });
    }
  );

  // 7. Staff Management (Manager ONLY)
  app.get(
    '/api/admin/staff',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('staff:manage'),
    async (_req, res) => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        const primary = getPrimaryAdminProfileSummary();
        const teamProfiles = [
          primary,
          ...Array.from(portalStaffAccounts.values())
            .filter((s) => s.role !== 'customer' && !revokedPortalUsers.has(s.id))
            .map((s) => ({
              id: s.id,
              email: s.email,
              full_name: s.fullName,
              role: s.role,
              created_at: s.createdAt,
            })),
        ];
        res.json({
          staff: teamProfiles,
          invitations: portalStaffInvitations.filter((i) => i.status === 'pending'),
          databaseConnected: false,
        });
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['staff', 'owner', 'manager']);
      const { data: invites } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('status', 'pending');

      res.json({
        staff: profiles || [],
        invitations: invites || [],
        databaseConnected: true,
      });
    }
  );

  app.post(
    '/api/admin/staff/invitations',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('staff:manage'),
    async (req: AuthenticatedRequest, res) => {
      const appAuth = req.appAuth!;
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const fullName =
        typeof req.body?.fullName === 'string' && req.body.fullName.trim()
          ? req.body.fullName.trim().slice(0, 80)
          : email.split('@')[0] || 'Team Member';
      const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
      const role: 'owner' | 'staff' =
        req.body?.role === 'owner' || req.body?.role === 'manager' ? 'owner' : 'staff';

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email address is required.' });
        return;
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        if (passcode && passcode.length < 6) {
          res.status(400).json({ error: 'Staff passcode must be at least 6 characters.' });
          return;
        }

        if (passcode) {
          const staffId = `staff-${crypto.randomBytes(4).toString('hex')}`;
          const { salt, hash } = hashPortalPasscode(passcode);
          portalStaffAccounts.set(staffId, {
            id: staffId,
            email,
            fullName,
            role,
            salt,
            hash,
            createdAt: new Date().toISOString(),
          });
          recordAuthAuditEvent({
            timestamp: new Date().toISOString(),
            actorUserId: appAuth.userId,
            actorRole: appAuth.policy.role,
            action: 'POST',
            target: '/api/admin/staff/invitations',
            outcome: 'allowed',
            reason: `created_portal_staff:${email},role:${role}`,
          });
          res.status(201).json({
            success: true,
            activated: true,
            staffMember: { id: staffId, email, full_name: fullName, role },
          });
          return;
        }

        const invite = {
          id: `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          email,
          role,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
        };
        portalStaffInvitations.unshift(invite);

        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: appAuth.userId,
          actorRole: appAuth.policy.role,
          action: 'POST',
          target: '/api/admin/staff/invitations',
          outcome: 'allowed',
          reason: `invited:${email},role:${role}`,
        });

        res.status(201).json({ success: true, invitation: invite });
        return;
      }

      const token = crypto.randomBytes(24).toString('hex');
      const { data, error } = await supabase
        .from('staff_invitations')
        .upsert(
          {
            email,
            role,
            invited_by: appAuth.userId,
            token,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: 'email' }
        )
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: appAuth.userId,
        actorRole: appAuth.policy.role,
        action: 'POST',
        target: '/api/admin/staff/invitations',
        outcome: 'allowed',
        reason: `invited:${email},role:${role}`,
      });

      res.json({ success: true, invitation: data });
    }
  );

  app.patch(
    '/api/admin/staff/:userId',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('staff:manage'),
    async (req: AuthenticatedRequest, res) => {
      const targetUserId = req.params.userId;
      const requestedRole = req.body?.role;
      const mappedRole =
        requestedRole === 'owner' || requestedRole === 'manager'
          ? 'owner'
          : requestedRole === 'staff'
          ? 'staff'
          : requestedRole === 'customer'
          ? 'customer'
          : undefined;

      if (targetUserId === req.appAuth!.userId && mappedRole && mappedRole !== 'owner') {
        res.status(400).json({ error: 'Manager cannot demote themselves.' });
        return;
      }

      if (targetUserId === 'portal-owner' && mappedRole && mappedRole !== 'owner') {
        res.status(400).json({ error: 'Primary portal owner role cannot be demoted.' });
        return;
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        const staff = portalStaffAccounts.get(targetUserId);
        if (!staff) {
          res.status(404).json({ error: 'Staff member not found.' });
          return;
        }
        if (mappedRole) {
          staff.role = mappedRole;
          if (mappedRole === 'customer') {
            revokedPortalUsers.add(targetUserId);
          } else {
            revokedPortalUsers.delete(targetUserId);
          }
        }
        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: req.appAuth!.userId,
          actorRole: req.appAuth!.policy.role,
          action: 'PATCH',
          target: `/api/admin/staff/${targetUserId}`,
          outcome: 'allowed',
          reason: `role:${mappedRole || 'unchanged'}`,
        });
        res.json({
          success: true,
          profile: {
            id: staff.id,
            email: staff.email,
            full_name: staff.fullName,
            role: staff.role,
            created_at: staff.createdAt,
          },
        });
        return;
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (mappedRole) updates.role = mappedRole;

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', targetUserId)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'PATCH',
        target: `/api/admin/staff/${targetUserId}`,
        outcome: 'allowed',
        reason: `role:${mappedRole || 'unchanged'}`,
      });

      res.json({ success: true, profile: data });
    }
  );

  app.delete(
    '/api/admin/staff/:userId',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('staff:manage'),
    async (req: AuthenticatedRequest, res) => {
      const targetUserId = req.params.userId;
      if (targetUserId === req.appAuth!.userId || targetUserId === 'portal-owner') {
        res.status(400).json({ error: 'Manager cannot remove their own access.' });
        return;
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        const staff = portalStaffAccounts.get(targetUserId);
        if (staff) {
          staff.role = 'customer';
          revokedPortalUsers.add(targetUserId);
        }
        const invIdx = portalStaffInvitations.findIndex((i) => i.id === targetUserId);
        if (invIdx !== -1) {
          portalStaffInvitations.splice(invIdx, 1);
        }
        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: req.appAuth!.userId,
          actorRole: req.appAuth!.policy.role,
          action: 'DELETE',
          target: `/api/admin/staff/${targetUserId}`,
          outcome: 'allowed',
          reason: 'revoked_staff_access',
        });
        res.json({ success: true });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: 'customer', updated_at: new Date().toISOString() })
        .eq('id', targetUserId);

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'DELETE',
        target: `/api/admin/staff/${targetUserId}`,
        outcome: 'allowed',
        reason: 'revoked_staff_access',
      });

      res.json({ success: true });
    }
  );

  // 8. Website Management & Restaurant Settings (Manager ONLY)
  app.get(
    '/api/admin/settings',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('settings:manage'),
    async (_req, res) => {
      const settings = await loadWebsiteSettings();
      res.json({ databaseConnected: isSupabaseConfigured(), settings });
    }
  );

  app.put(
    '/api/admin/settings',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('settings:manage'),
    async (req: AuthenticatedRequest, res) => {
      const incoming = (req.body?.settings || {}) as Partial<WebsiteSettings>;
      liveSettings = {
        ...liveSettings,
        restaurantName:
          typeof incoming.restaurantName === 'string' && incoming.restaurantName.trim()
            ? incoming.restaurantName.trim()
            : liveSettings.restaurantName,
        currency: 'NGN',
        isOpen: incoming.isOpen !== undefined ? Boolean(incoming.isOpen) : liveSettings.isOpen,
        address:
          typeof incoming.address === 'string' && incoming.address.trim()
            ? incoming.address.trim()
            : liveSettings.address,
        phone:
          typeof incoming.phone === 'string' && incoming.phone.trim()
            ? incoming.phone.trim()
            : liveSettings.phone,
        email:
          typeof incoming.email === 'string' ? incoming.email.trim() : liveSettings.email,
        openingHours:
          typeof incoming.openingHours === 'string' && incoming.openingHours.trim()
            ? incoming.openingHours.trim()
            : liveSettings.openingHours,
        heroSubtitle:
          typeof incoming.heroSubtitle === 'string' && incoming.heroSubtitle.trim()
            ? incoming.heroSubtitle.trim()
            : liveSettings.heroSubtitle,
        heroDescription:
          typeof incoming.heroDescription === 'string' && incoming.heroDescription.trim()
            ? incoming.heroDescription.trim()
            : liveSettings.heroDescription,
        welcomeHeading:
          typeof incoming.welcomeHeading === 'string' && incoming.welcomeHeading.trim()
            ? incoming.welcomeHeading.trim()
            : liveSettings.welcomeHeading,
        welcomeBody:
          typeof incoming.welcomeBody === 'string' && incoming.welcomeBody.trim()
            ? incoming.welcomeBody.trim()
            : liveSettings.welcomeBody,
        menuNotice:
          typeof incoming.menuNotice === 'string'
            ? incoming.menuNotice.trim()
            : liveSettings.menuNotice,
      };

      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error } = await supabase.from('restaurant_settings').upsert({
          key: 'general',
          value: liveSettings,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      recordAuthAuditEvent({
        timestamp: new Date().toISOString(),
        actorUserId: req.appAuth!.userId,
        actorRole: req.appAuth!.policy.role,
        action: 'PUT',
        target: '/api/admin/settings',
        outcome: 'allowed',
        reason: 'updated_website_settings',
      });

      res.json({ success: true, settings: liveSettings });
    }
  );

  // 9. Notifications (Staff + Manager)
  app.get(
    '/api/admin/notifications',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('notifications:read'),
    async (_req, res) => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        res.json({ notifications: liveNotifications, databaseConnected: false });
        return;
      }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      res.json({ notifications: data || liveNotifications, databaseConnected: true });
    }
  );

  app.patch(
    '/api/admin/notifications/read-all',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('notifications:read'),
    async (_req, res) => {
      for (const n of liveNotifications) {
        n.is_read = true;
      }
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      }
      res.json({ success: true });
    }
  );

  app.patch(
    '/api/admin/notifications/:id/read',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('notifications:read'),
    async (req: AuthenticatedRequest, res) => {
      const notifId = req.params.id;
      const target = liveNotifications.find((n) => n.id === notifId);
      if (target) target.is_read = true;

      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
      }
      res.json({ success: true });
    }
  );

  // 10. Activity Logs (Manager ONLY)
  app.get(
    '/api/admin/activity-logs',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('audit:read'),
    async (_req, res) => {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (Array.isArray(data) && data.length > 0) {
          res.json({ logs: data, databaseConnected: true });
          return;
        }
      }

      res.json({
        logs: recentAuditLogs.map((l) => ({
          id: l.id,
          actor_user_id: l.actorUserId,
          actor_role: l.actorRole,
          action: l.action,
          target: l.target,
          outcome: l.outcome,
          reason: l.reason ?? null,
          created_at: l.timestamp,
        })),
        databaseConnected: isSupabaseConfigured(),
      });
    }
  );

  interface CustomerReviewRecord {
    id: string;
    orderReference: string;
    mealId: string;
    mealName: string;
    userId: string;
    customerEmail: string;
    customerName: string;
    rating: number;
    foodQuality: number;
    foodTaste: number;
    portionSize: number;
    packaging: number;
    serviceExperience: number;
    comment: string;
    isVerifiedPurchase: boolean;
    status: 'pending' | 'approved' | 'hidden';
    createdAt: string;
  }

  const liveReviews: CustomerReviewRecord[] = [];

  async function loadReviewsList(): Promise<CustomerReviewRecord[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('key', 'customer_reviews')
          .maybeSingle();
        if (Array.isArray(data?.value) && data.value.length > 0) {
          return data.value as CustomerReviewRecord[];
        }
      } catch {
        // Fall back to in-memory liveReviews
      }
    }
    return liveReviews;
  }

  async function saveReviewsList(list: CustomerReviewRecord[]): Promise<void> {
    liveReviews.length = 0;
    liveReviews.push(...list);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('restaurant_settings').upsert({
          key: 'customer_reviews',
          value: list,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Keep in-memory state
      }
    }
  }

  // Public Reviews Endpoint
  app.get('/api/reviews', async (_req, res) => {
    const reviews = await loadReviewsList();
    const approved = reviews.filter((r) => r.status === 'approved');
    const avg =
      approved.length > 0
        ? Number((approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1))
        : 4.8;
    res.json({
      reviews: approved,
      summary: {
        totalReviews: approved.length,
        averageRating: avg,
      },
    });
  });

  // Reviewable Orders Endpoint for Customer
  app.get(
    '/api/orders/reviewable',
    requireAuthenticatedSession,
    requirePermission('account:read'),
    async (req: AuthenticatedRequest, res) => {
      const userId = req.appAuth!.userId;
      const supabase = getSupabaseAdmin();
      let userOrders: Array<{ reference: string; status: string; payment_status: string; created_at: string }> = [];

      if (supabase) {
        const { data } = await supabase
          .from('orders')
          .select('reference, status, payment_status, created_at')
          .eq('owner_id', userId);
        userOrders = data || [];
      } else {
        userOrders = Array.from(ordersByReference.values())
          .filter((o) => o.ownerId === userId)
          .map((o) => ({
            reference: o.reference,
            status: o.status,
            payment_status: o.paymentStatus,
            created_at: o.createdAt,
          }));
      }

      const eligible = userOrders.filter((o) => o.payment_status === 'paid');
      const reviews = await loadReviewsList();
      const userReviewMap = new Set(
        reviews.filter((r) => r.userId === userId).map((r) => r.orderReference + ':' + r.mealId)
      );

      const results = [];
      for (const ord of eligible) {
        let items: Array<{ meal_id: string; name: string }> = [];
        if (supabase) {
          const { data: dbItems } = await supabase
            .from('order_items')
            .select('meal_id, name')
            .eq('order_reference', ord.reference);
          items = dbItems || [];
        } else {
          const oRec = ordersByReference.get(ord.reference);
          items = (oRec?.items || []).map((it) => ({ meal_id: it.mealId, name: it.name }));
        }

        results.push({
          reference: ord.reference,
          createdAt: ord.created_at,
          status: ord.status,
          items: items.map((it) => ({
            mealId: it.meal_id,
            name: it.name,
            alreadyReviewed: userReviewMap.has(ord.reference + ':' + it.meal_id),
          })),
        });
      }

      res.json({ orders: results });
    }
  );

  // Submit Review Endpoint
  app.post(
    '/api/reviews',
    requireAuthenticatedSession,
    requirePermission('cart:write'),
    async (req: AuthenticatedRequest, res) => {
      const userId = req.appAuth!.userId;
      const email = req.appAuth!.verifiedEmail || '';
      const fullName = req.appAuth!.fullName || 'Yomat Kitchen Customer';

      const body = req.body || {};
      const orderReference = typeof body.orderReference === 'string' ? body.orderReference.trim() : '';
      const mealId = typeof body.mealId === 'string' ? body.mealId.trim() : '';
      const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
      const foodQuality = Math.max(1, Math.min(5, Number(body.foodQuality) || rating));
      const foodTaste = Math.max(1, Math.min(5, Number(body.foodTaste) || rating));
      const portionSize = Math.max(1, Math.min(5, Number(body.portionSize) || rating));
      const packaging = Math.max(1, Math.min(5, Number(body.packaging) || rating));
      const serviceExperience = Math.max(1, Math.min(5, Number(body.serviceExperience) || rating));
      const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

      if (!orderReference || !mealId || !comment) {
        res.status(400).json({ error: 'Order reference, meal, and written comment are required.' });
        return;
      }

      const supabase = getSupabaseAdmin();
      let orderPaid = false;
      let mealName = mealId;

      if (supabase) {
        const { data: ord } = await supabase
          .from('orders')
          .select('*')
          .eq('reference', orderReference)
          .eq('owner_id', userId)
          .maybeSingle();
        if (ord && ord.payment_status === 'paid') {
          orderPaid = true;
        }
        const { data: item } = await supabase
          .from('order_items')
          .select('name')
          .eq('order_reference', orderReference)
          .eq('meal_id', mealId)
          .maybeSingle();
        if (item) mealName = item.name;
      } else {
        const ord = ordersByReference.get(orderReference);
        if (ord && ord.ownerId === userId && ord.paymentStatus === 'paid') {
          orderPaid = true;
          const found = ord.items.find((i) => i.mealId === mealId);
          if (found) mealName = found.name;
        }
      }

      if (!orderPaid) {
        res.status(403).json({ error: 'Review eligibility denied: order must be verified and paid.' });
        return;
      }

      const reviews = await loadReviewsList();
      const duplicate = reviews.find(
        (r) => r.userId === userId && r.orderReference === orderReference && r.mealId === mealId
      );
      if (duplicate) {
        res.status(400).json({ error: 'You have already submitted a review for this meal on this order.' });
        return;
      }

      const newReview: CustomerReviewRecord = {
        id: `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        orderReference,
        mealId,
        mealName,
        userId,
        customerEmail: email,
        customerName: fullName,
        rating,
        foodQuality,
        foodTaste,
        portionSize,
        packaging,
        serviceExperience,
        comment,
        isVerifiedPurchase: true,
        status: 'approved',
        createdAt: new Date().toISOString(),
      };

      await saveReviewsList([newReview, ...reviews]);
      res.status(201).json({ success: true, review: newReview });
    }
  );

  // Admin Reviews Management Endpoint
  app.get(
    '/api/admin/reviews',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('admin:access'),
    async (_req, res) => {
      const reviews = await loadReviewsList();
      res.json({ reviews });
    }
  );

  app.patch(
    '/api/admin/reviews/:id',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('admin:access'),
    async (req: AuthenticatedRequest, res) => {
      const reviewId = req.params.id;
      const status = req.body?.status;
      if (!['approved', 'hidden', 'deleted'].includes(status)) {
        res.status(400).json({ error: 'Invalid review status.' });
        return;
      }

      const reviews = await loadReviewsList();
      if (status === 'deleted') {
        const filtered = reviews.filter((r) => r.id !== reviewId);
        await saveReviewsList(filtered);
        res.json({ success: true });
        return;
      }

      const idx = reviews.findIndex((r) => r.id === reviewId);
      if (idx === -1) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }

      reviews[idx] = { ...reviews[idx], status };
      await saveReviewsList(reviews);
      res.json({ success: true, review: reviews[idx] });
    }
  );

  // AI Business Insights Endpoint
  app.post(
    '/api/admin/ai-insights',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('analytics:read'),
    async (req: AuthenticatedRequest, res) => {
      const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error:
            'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to generate AI Business Insights.',
        });
        return;
      }

      const period = typeof req.body?.period === 'string' ? req.body.period : 'monthly';
      const topic = typeof req.body?.topic === 'string' ? req.body.topic : 'complete';

      const reviews = await loadReviewsList();
      const approvedReviews = reviews.filter((r) => r.status === 'approved');
      const supabase = getSupabaseAdmin();
      let totalRevenue = 0;
      let totalOrdersCount = 0;
      let paidOrdersCount = 0;

      if (supabase) {
        const { data: dbOrders } = await supabase.from('orders').select('*');
        if (dbOrders) {
          totalOrdersCount = dbOrders.length;
          for (const o of dbOrders) {
            if (o.payment_status === 'paid') {
              totalRevenue += o.total_naira;
              paidOrdersCount++;
            }
          }
        }
      } else {
        for (const o of ordersByReference.values()) {
          totalOrdersCount++;
          if (o.paymentStatus === 'paid') {
            totalRevenue += o.totalNaira;
            paidOrdersCount++;
          }
        }
      }

      const avgRating =
        approvedReviews.length > 0
          ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
          : '4.8';

      const dataSummary = {
        restaurantName: 'Yomat Kitchen',
        location:
          'Behind Science Laboratory Technology, University of Benin, Uselu, Benin City, Edo State, Nigeria',
        reportingPeriod: period,
        analysisTopic: topic,
        totalOrders: totalOrdersCount,
        paidOrders: paidOrdersCount,
        totalPaidRevenueNaira: totalRevenue,
        averageOrderValueNaira: paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0,
        totalReviewsAnalyzed: approvedReviews.length,
        averageCustomerRating: Number(avgRating),
        customerReviewsSample: approvedReviews.slice(0, 15).map((r) => ({
          meal: r.mealName,
          rating: r.rating,
          comment: r.comment,
          verified: r.isVerifiedPurchase,
        })),
      };

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const prompt = `Analyze the following actual restaurant business data for Yomat Kitchen in Uselu, Benin City, Edo State, for reporting period "${period}" and topic "${topic}":\n\n${JSON.stringify(
        dataSummary,
        null,
        2
      )}\n\nProvide a comprehensive, professional management report in valid JSON format containing these exact keys:\n- executiveSummary (string)\n- businessPerformanceOverview (string)\n- customerSatisfaction (string)\n- customerSentimentAnalysis (string)\n- strengths (array of strings)\n- areasForImprovement (array of strings)\n- bestPerformingMeals (array of strings)\n- mealsNeedingAttention (array of strings)\n- salesAndOrderingTrends (string)\n- businessOpportunities (array of strings)\n- aiRecommendations (array of strings)\n- managementActionPlan (array of strings)\n- dataCoverageNote (string)`;

      try {
        const result = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert restaurant management and business intelligence AI for Yomat Kitchen in Uselu, Benin City, Edo State. Return only valid JSON adhering strictly to the requested schema. Do not invent sales or review counts beyond the provided JSON.',
            responseMimeType: 'application/json',
          },
        });

        const rawText = (result.text || '{}')
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        let reportJson: Record<string, unknown>;
        try {
          reportJson = JSON.parse(rawText);
        } catch {
          res.status(502).json({
            error: 'Gemini returned an unreadable response format. Please retry generating the report.',
          });
          return;
        }

        recordAuthAuditEvent({
          timestamp: new Date().toISOString(),
          actorUserId: req.appAuth!.userId,
          actorRole: req.appAuth!.policy.role,
          action: 'POST',
          target: '/api/admin/ai-insights',
          outcome: 'allowed',
          reason: `generated_report:period=${period},topic=${topic}`,
        });

        res.json({
          success: true,
          period,
          topic,
          generatedAt: new Date().toISOString(),
          metrics: dataSummary,
          report: reportJson,
        });
      } catch (err) {
        console.error('AI Insights generation error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to generate AI business insights report.';
        const statusCode =
          msg.includes('API_KEY') || msg.includes('PERMISSION_DENIED') ? 403 : 502;
        res.status(statusCode).json({ error: msg });
      }
    }
  );

  // AI Assistant Chat Endpoint
  app.post(
    '/api/admin/ai-chat',
    requireAuthenticatedSession,
    requireRole('owner', 'manager'),
    requirePermission('analytics:read'),
    async (req: AuthenticatedRequest, res) => {
      const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error:
            'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to chat with the AI Business Assistant.',
        });
        return;
      }

      const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
      if (!question) {
        res.status(400).json({ error: 'Question is required.' });
        return;
      }

      const reviews = await loadReviewsList();
      const approvedReviews = reviews.filter((r) => r.status === 'approved');
      const supabase = getSupabaseAdmin();
      let totalRevenue = 0;
      let paidOrdersCount = 0;

      if (supabase) {
        const { data: dbOrders } = await supabase.from('orders').select('*');
        if (dbOrders) {
          for (const o of dbOrders) {
            if (o.payment_status === 'paid') {
              totalRevenue += o.total_naira;
              paidOrdersCount++;
            }
          }
        }
      } else {
        for (const o of ordersByReference.values()) {
          if (o.paymentStatus === 'paid') {
            totalRevenue += o.totalNaira;
            paidOrdersCount++;
          }
        }
      }

      const avgRating =
        approvedReviews.length > 0
          ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
          : '4.8';

      const dataContext = `Restaurant: Yomat Kitchen (Behind Science Laboratory Technology, University of Benin, Uselu, Benin City, Edo State, Nigeria).\nTotal Paid Revenue: ₦${totalRevenue.toLocaleString()}.\nCompleted/Paid Orders: ${paidOrdersCount}.\nVerified Reviews: ${approvedReviews.length}.\nAverage Rating: ${avgRating}/5.0.\nRecent Customer Feedback: ${JSON.stringify(
        approvedReviews.map((r) => `${r.mealName}: ${r.rating} stars - "${r.comment}"`)
      )}`;

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      try {
        const result = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Manager Question: "${question}"`,
          config: {
            systemInstruction: `You are the interactive AI Business Assistant for Yomat Kitchen management in Uselu, Benin City, Edo State. Answer the manager's question accurately using only the provided restaurant context. Never invent figures or reviews.\n\nContext:\n${dataContext}`,
          },
        });

        res.json({
          answer: result.text || 'I could not generate an answer at this moment.',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI Assistant failed to respond.';
        const statusCode =
          msg.includes('API_KEY') || msg.includes('PERMISSION_DENIED') ? 403 : 502;
        res.status(statusCode).json({ error: msg });
      }
    }
  );

  app.use(
    '/api/admin',
    requireAuthenticatedSession,
    requireRole('staff', 'owner', 'manager'),
    requirePermission('admin:access'),
    (_req, res) => {
      res.status(404).json({ error: 'Admin API route not found.' });
    }
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  app.use(
    '/api',
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('Unhandled /api error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'An internal API error occurred.' });
      }
    }
  );

  return app;
}

