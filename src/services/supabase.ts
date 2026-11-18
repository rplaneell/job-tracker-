import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let client: SupabaseClient | null = null;

/** True once the two public Supabase variables are present in .env. */
export const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Lazily creates the Supabase client. Nothing connects until this is called,
 * so the app runs fine before a Supabase project exists.
 */
export function getSupabase(): SupabaseClient {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and fill in the values.',
    );
  }
  client ??= createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return client;
}
