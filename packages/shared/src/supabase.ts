import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  options?: { auth?: { persistSession?: boolean } }
): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      ...options?.auth
    }
  });
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}

export function initSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  options?: { auth?: { persistSession?: boolean } }
): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }
  supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey, options);
  return supabaseClient;
}

export function createServerClient(
  supabaseUrl: string,
  serviceRoleKey: string
): SupabaseClient {
  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

export function createBrowserClient(
  supabaseUrl: string,
  anonKey: string
): SupabaseClient {
  return createSupabaseClient(supabaseUrl, anonKey);
}
