import { createClient, SupabaseClient } from '@supabase/supabase-js';

// User's connected Supabase project defaults
const FALLBACK_SUPABASE_URL = 'https://cfgxlzianhgsardrntnv.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_unYHPfXUOAzHrFaRPtncyA_W4PMNX3q';

const supabaseUrl: string =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  (import.meta.env.SUPABASE_URL as string) ||
  FALLBACK_SUPABASE_URL;

const supabaseAnonKey: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.SUPABASE_ANON_KEY as string) ||
  FALLBACK_SUPABASE_KEY;

export const isSupabaseConfigured = (): boolean => {
  if (
    typeof supabaseUrl !== 'string' ||
    supabaseUrl.trim().length === 0 ||
    supabaseUrl.includes('your-project-id') ||
    supabaseUrl.includes('placeholder') ||
    typeof supabaseAnonKey !== 'string' ||
    supabaseAnonKey.trim().length === 0 ||
    supabaseAnonKey.includes('your-anon-public-key') ||
    supabaseAnonKey.includes('placeholder')
  ) {
    return false;
  }
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  publishableKey: supabaseAnonKey,
  jwksUrl: 'https://cfgxlzianhgsardrntnv.supabase.co/auth/v1/.well-known/jwks.json',
};


