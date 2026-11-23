import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { isClerkConfigured } from '../lib/clerkConfig';
import { parseApiJson } from '../lib/api';

export type AppRole = 'customer' | 'staff' | 'owner' | 'manager';

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
}

const AppAuthContext = createContext<AppAuthState | undefined>(undefined);

interface ServerMePayload {
  authorization?: {
    role?: AppRole;
    permissions?: string[];
    canAccessAdmin?: boolean;
  };
}

function ClerkBackedAuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [role, setRole] = useState<AppRole>('customer');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  const safeGetToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  const fetchServerAuthorization = useCallback(async () => {
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
  }, [isLoaded, isSignedIn, userId, safeGetToken]);

  useEffect(() => {
    void fetchServerAuthorization();
  }, [fetchServerAuthorization]);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const isManager = role === 'owner' || role === 'manager';

  const value: AppAuthState = {
    isClerkConfigured: true,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    authResolved,
    userId: userId ?? null,
    fullName: user?.fullName || user?.firstName || null,
    email: user?.primaryEmailAddress?.emailAddress || null,
    imageUrl: user?.imageUrl || null,
    role,
    isManager,
    permissions,
    canAccessAdmin,
    hasPermission,
    refreshAuthorization: fetchServerAuthorization,
    getToken: safeGetToken,
    signOut: async () => {
      setRole('customer');
      setPermissions([]);
      setCanAccessAdmin(false);
      await signOut({ redirectUrl: '/' });
    },
  };

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

function UnconfiguredAuthProvider({ children }: { children: React.ReactNode }) {
  const value: AppAuthState = {
    isClerkConfigured: false,
    isLoaded: true,
    isSignedIn: false,
    authResolved: true,
    userId: null,
    fullName: null,
    email: null,
    imageUrl: null,
    role: 'customer',
    isManager: false,
    permissions: [],
    canAccessAdmin: false,
    hasPermission: () => false,
    refreshAuthorization: async () => {},
    getToken: async () => null,
    signOut: async () => {},
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
  return <UnconfiguredAuthProvider>{children}</UnconfiguredAuthProvider>;
}

export function useAppAuth(): AppAuthState {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error('useAppAuth must be used within AppAuthProvider');
  }
  return ctx;
}
