export function normalizePublishableKey(raw: string): string {
  let val = raw.trim();
  // Strip accidental "ENV_NAME=" prefix if pasted from a .env line
  if (/^[A-Z0-9_]+=(.+)$/.test(val)) {
    val = val.slice(val.indexOf('=') + 1).trim();
  }
  return val.replace(/^['"]|['"]$/g, '').trim();
}

export function isValidPublishableKey(key: string): boolean {
  return /^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(key);
}

export const CLERK_PUBLISHABLE_KEY = normalizePublishableKey(
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''
);

export const isClerkConfigured = isValidPublishableKey(CLERK_PUBLISHABLE_KEY);
