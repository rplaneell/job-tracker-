import { z } from 'zod';

/**
 * Validated public environment variables. Only VITE_ prefixed values reach the browser,
 * so never put a secret here. The Supabase publishable key is designed to be public;
 * access is protected by Row Level Security in the database.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, unknown>): AppEnv {
  // Treat empty strings (as in .env.example) as "not set".
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  return envSchema.parse(cleaned);
}

export const env: AppEnv = parseEnv(import.meta.env);
