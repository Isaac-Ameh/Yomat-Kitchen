import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ClerkFailed, ClerkLoaded, ClerkLoading } from '@clerk/react';
import { AlertCircle, ExternalLink, KeyRound, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAppAuth } from '../context/AppAuthContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const {
    isClerkConfigured,
    isLoaded,
    isSignedIn,
    authResolved,
    canAccessAdmin,
    signOut,
  } = useAppAuth();
  const location = useLocation();

  const [checkingOwner, setCheckingOwner] = useState(true);
  const [ownerInitialized, setOwnerInitialized] = useState<boolean | null>(null);
  const [setupToken, setSetupToken] = useState('');
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapSuccess, setBootstrapSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/health')
        .then((res) => res.json())
        .then((data: { ownerInitialized?: boolean }) => {
          setOwnerInitialized(Boolean(data.ownerInitialized));
        })
        .catch(() => {
          setOwnerInitialized(false);
        })
        .finally(() => {
          setCheckingOwner(false);
        });
    } else {
      setCheckingOwner(false);
    }
  }, [isSignedIn]);

  const handleBootstrapOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBootstrapLoading(true);
    setBootstrapError(null);
    setBootstrapSuccess(null);

    try {
      const res = await fetch('/api/admin/bootstrap-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim initial owner profile.');
      }
      setBootstrapSuccess('Initial owner profile provisioned successfully! Refreshing access...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      setBootstrapError(err instanceof Error ? err.message : 'An error occurred during bootstrap.');
    } finally {
      setBootstrapLoading(false);
    }
  };

  if (!isClerkConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4 py-12">
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#5A0B1E]/8 text-[#5A0B1E] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
            Authentication Required for Admin
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Configure Clerk environment keys to sign in and verify administrative access.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm font-medium transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ClerkLoading>
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#5A0B1E]/20 border-t-[#5A0B1E] animate-spin" />
            <p className="text-sm text-[#57534E]">Verifying admin access...</p>
          </div>
        </div>
      </ClerkLoading>

      <ClerkFailed>
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4">
          <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl border border-[#B91C1C]/20 p-6 sm:p-8 text-center space-y-4">
            <div className="w-11 h-11 mx-auto rounded-full bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h1 className="font-display text-xl font-semibold text-[#1C1917]">
              Authentication Unavailable in Embedded View
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Clerk could not load inside this frame. Try opening the portal in a full browser tab.
            </p>
            {typeof window !== 'undefined' && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm font-medium transition-colors"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </ClerkFailed>

      <ClerkLoaded>
        {!isLoaded || (isSignedIn && (!authResolved || checkingOwner)) ? (
          <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#5A0B1E]/20 border-t-[#5A0B1E] animate-spin" />
              <p className="text-sm text-[#57534E]">Verifying admin permissions...</p>
            </div>
          </div>
        ) : !isSignedIn ? (
          <Navigate
            to={`/sign-in?redirect_url=${encodeURIComponent(location.pathname + location.search)}`}
            replace
          />
        ) : !canAccessAdmin ? (
          <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4 py-12">
            <div className="w-full max-w-lg bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 sm:p-8 text-left space-y-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-semibold text-[#1C1917]">
                    Admin Access Restricted
                  </h1>
                  <p className="text-sm text-[#57534E]">
                    Your account is signed in, but does not currently hold administrator privileges.
                  </p>
                </div>
              </div>

              {ownerInitialized === false ? (
                <div className="p-5 rounded-xl bg-[#F4EFE8] border border-[#5A0B1E]/15 space-y-4">
                  <div className="flex items-center gap-2.5 text-[#5A0B1E]">
                    <KeyRound className="w-5 h-5" />
                    <h2 className="font-semibold text-sm">Initial Restaurant Owner Bootstrap</h2>
                  </div>
                  <p className="text-xs text-[#57534E] leading-relaxed">
                    No restaurant owner has been provisioned in the database yet. You can securely claim initial owner privileges for your signed-in account using the bootstrap setup token.
                  </p>

                  <form onSubmit={handleBootstrapOwner} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1C1917] mb-1">
                        Bootstrap Setup Token
                      </label>
                      <input
                        type="text"
                        value={setupToken}
                        onChange={(e) => setSetupToken(e.target.value)}
                        placeholder="Enter bootstrap token"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#1C1917]/20 rounded-lg focus:outline-none focus:border-[#5A0B1E]"
                        required
                      />
                      <p className="text-[11px] text-[#57534E] mt-1">
                        Enter the server environment variable <code className="bg-white px-1.5 py-0.5 rounded border border-[#1C1917]/10 font-mono text-xs">EASI_MARK_BOOTSTRAP_TOKEN</code>.
                      </p>
                    </div>

                    {bootstrapError && (
                      <div className="p-3 rounded-lg bg-[#B91C1C]/10 text-[#B91C1C] text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{bootstrapError}</span>
                      </div>
                    )}

                    {bootstrapSuccess && (
                      <div className="p-3 rounded-lg bg-[#15803D]/10 text-[#15803D] text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{bootstrapSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={bootstrapLoading}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {bootstrapLoading ? 'Provisioning Owner...' : 'Claim Initial Owner Access'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[#F4EFE8] text-xs text-[#57534E]">
                  An owner is already registered for this restaurant database. Contact the existing owner to request staff invitation access.
                </div>
              )}

              <div className="pt-2 flex flex-wrap justify-between items-center gap-3 border-t border-[#1C1917]/10">
                <div className="flex gap-2">
                  <Link
                    to="/menu"
                    className="px-4 py-2 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-xs font-medium transition-colors"
                  >
                    Browse Menu
                  </Link>
                  <Link
                    to="/"
                    className="px-4 py-2 rounded-lg border border-[#1C1917]/15 text-xs font-medium text-[#1C1917] hover:bg-[#F4EFE8] transition-colors"
                  >
                    Home
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="px-4 py-2 rounded-lg border border-[#1C1917]/15 text-xs font-medium text-[#57534E] hover:bg-[#F4EFE8] transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>{children}</>
        )}
      </ClerkLoaded>
    </>
  );
}
