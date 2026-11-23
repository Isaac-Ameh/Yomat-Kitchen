import { Link } from 'react-router-dom';
import { ClerkFailed, ClerkLoading, Show, UserButton } from '@clerk/react';
import { ShieldCheck, User } from 'lucide-react';
import { useAppAuth } from '../context/AppAuthContext';

interface ClerkAuthControlsProps {
  isOverDarkHero?: boolean;
  variant?: 'desktop' | 'mobile';
  onAction?: () => void;
}

function SignedOutButtons({
  isOverDarkHero,
  variant,
  onAction,
}: {
  isOverDarkHero: boolean;
  variant: 'desktop' | 'mobile';
  onAction?: () => void;
}) {
  if (variant === 'desktop') {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/sign-in"
          onClick={onAction}
          className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isOverDarkHero
              ? 'text-[#FAF7F2]/90 hover:text-white hover:bg-white/10'
              : 'text-[#1C1917] hover:text-[#5A0B1E] hover:bg-[#5A0B1E]/5'
          }`}
        >
          Sign In
        </Link>
        <Link
          to="/sign-up"
          onClick={onAction}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isOverDarkHero
              ? 'bg-[#FAF7F2] text-[#5A0B1E] hover:bg-white'
              : 'bg-[#5A0B1E] text-[#FAF7F2] hover:bg-[#731129]'
          }`}
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <Link
        to="/sign-in"
        onClick={onAction}
        className="w-full text-center px-4 py-2.5 text-sm font-medium rounded-lg border border-[#1C1917]/20 text-[#1C1917] hover:bg-[#F4EFE8] transition-colors whitespace-nowrap"
      >
        Sign In
      </Link>
      <Link
        to="/sign-up"
        onClick={onAction}
        className="w-full text-center px-4 py-2.5 text-sm font-medium rounded-lg bg-[#5A0B1E] text-[#FAF7F2] hover:bg-[#731129] transition-colors whitespace-nowrap"
      >
        Sign Up
      </Link>
    </div>
  );
}

export function ClerkAuthControls({
  isOverDarkHero = false,
  variant = 'desktop',
  onAction,
}: ClerkAuthControlsProps) {
  const { isClerkConfigured, isSignedIn, canAccessAdmin, fullName, signOut } =
    useAppAuth();

  if (!isClerkConfigured) {
    return (
      <SignedOutButtons
        isOverDarkHero={isOverDarkHero}
        variant={variant}
        onAction={onAction}
      />
    );
  }

  if (variant === 'desktop') {
    return (
      <>
        <ClerkLoading>
          <SignedOutButtons
            isOverDarkHero={isOverDarkHero}
            variant="desktop"
            onAction={onAction}
          />
        </ClerkLoading>

        <ClerkFailed>
          <SignedOutButtons
            isOverDarkHero={isOverDarkHero}
            variant="desktop"
            onAction={onAction}
          />
        </ClerkFailed>

        <Show when="signed-out">
          <SignedOutButtons
            isOverDarkHero={isOverDarkHero}
            variant="desktop"
            onAction={onAction}
          />
        </Show>

        <Show when="signed-in">
          <div className="flex items-center gap-2 shrink-0">
            {canAccessAdmin && (
              <Link
                to="/admin"
                onClick={onAction}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isOverDarkHero
                    ? 'text-[#FAF7F2]/90 hover:text-white hover:bg-white/10'
                    : 'text-[#5A0B1E] hover:bg-[#5A0B1E]/8'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
            <Link
              to="/account"
              onClick={onAction}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isOverDarkHero
                  ? 'text-[#FAF7F2]/90 hover:text-white hover:bg-white/10'
                  : 'text-[#1C1917] hover:text-[#5A0B1E] hover:bg-[#5A0B1E]/5'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Account</span>
            </Link>
            <UserButton />
          </div>
        </Show>
      </>
    );
  }

  if (isSignedIn) {
    return (
      <div className="space-y-2 pt-2">
        {canAccessAdmin && (
          <Link
            to="/admin"
            onClick={onAction}
            className="block w-full px-3 py-2.5 rounded-lg text-base font-medium text-[#5A0B1E] hover:bg-[#5A0B1E]/8 transition-colors"
          >
            Admin Portal
          </Link>
        )}
        <Link
          to="/account"
          onClick={onAction}
          className="block w-full px-3 py-2.5 rounded-lg text-base font-medium text-[#1C1917] hover:bg-[#F4EFE8] transition-colors"
        >
          Account {fullName ? `(${fullName})` : ''}
        </Link>
        <button
          type="button"
          onClick={() => {
            onAction?.();
            void signOut();
          }}
          className="w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-[#B91C1C] hover:bg-[#B91C1C]/8 transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <SignedOutButtons
      isOverDarkHero={isOverDarkHero}
      variant="mobile"
      onAction={onAction}
    />
  );
}
