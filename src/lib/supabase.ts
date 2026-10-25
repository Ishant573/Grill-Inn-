import { createClient, SupabaseClient } from '@supabase/supabase-js';

// User's connected Supabase project public defaults
const FALLBACK_SUPABASE_URL = 'https://cfgxlzianhgsardrntnv.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_unYHPfXUOAzHrFaRPtncyA_W4PMNX3q';

// Safe environment variable retrieval across Vite and Node
const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return String(import.meta.env[key]).trim();
    }
  } catch {
    // ignore
  }
  return '';
};

export const supabaseUrl: string =
  getEnv('VITE_SUPABASE_URL') ||
  getEnv('SUPABASE_URL') ||
  FALLBACK_SUPABASE_URL;

export const supabaseAnonKey: string =
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  FALLBACK_SUPABASE_KEY;

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (
    supabaseUrl.includes('your-project-id') ||
    supabaseUrl.includes('placeholder') ||
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
  host: (() => {
    try {
      return new URL(supabaseUrl).host;
    } catch {
      return 'unknown';
    }
  })(),
};

// Non-sensitive Connection Diagnostic (Requirement 11)
export interface SupabaseDiagnosticResult {
  isConfigured: boolean;
  projectHost: string;
  tableChecked: string;
  success: boolean;
  itemCount?: number;
  latencyMs?: number;
  errorMessage?: string;
  errorCode?: string;
  timestamp: string;
}

export async function testSupabaseConnection(): Promise<SupabaseDiagnosticResult> {
  const host = SUPABASE_CONFIG.host;
  const timestamp = new Date().toLocaleTimeString();

  if (!isSupabaseConfigured() || !supabase) {
    return {
      isConfigured: false,
      projectHost: host,
      tableChecked: 'categories',
      success: false,
      errorMessage: 'Supabase URL or Publishable Key is not configured.',
      timestamp,
    };
  }

  const startTime = Date.now();
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, is_active')
      .limit(5);

    const latencyMs = Date.now() - startTime;

    if (error) {
      return {
        isConfigured: true,
        projectHost: host,
        tableChecked: 'categories',
        success: false,
        latencyMs,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp,
      };
    }

    return {
      isConfigured: true,
      projectHost: host,
      tableChecked: 'categories',
      success: true,
      latencyMs,
      itemCount: Array.isArray(data) ? data.length : 0,
      timestamp,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    return {
      isConfigured: true,
      projectHost: host,
      tableChecked: 'categories',
      success: false,
      latencyMs,
      errorMessage: err instanceof Error ? err.message : 'Network fetch failed',
      timestamp,
    };
  }
}
