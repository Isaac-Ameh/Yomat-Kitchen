import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeClerkEnvValue } from './authorization.ts';

const supabaseUrl = normalizeClerkEnvValue(process.env.SUPABASE_URL);
const supabaseServiceKey = normalizeClerkEnvValue(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

export function isSupabaseConfigured(): boolean {
  // Fail closed: never use anon/public key for privileged server-side admin operations
  return Boolean(
    supabaseUrl &&
      supabaseServiceKey &&
      !supabaseUrl.includes('MY_SUPABASE_URL') &&
      !supabaseUrl.includes('your-supabase') &&
      !supabaseServiceKey.includes('anon')
  );
}

let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!adminClientInstance) {
    adminClientInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClientInstance;
}
