import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateEnv } from "./env";

let serverClient: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (serverClient) {
    return serverClient;
  }

  const env = validateEnv();

  serverClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return serverClient;
}

export function getBrowserClient(): SupabaseClient {
  const env = validateEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
