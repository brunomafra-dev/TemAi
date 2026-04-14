import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env-server";

let cachedServiceRoleClient: SupabaseClient | null = null;
let cachedAnonServerClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return serverEnv.supabaseUrl();
}

export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (cachedServiceRoleClient) return cachedServiceRoleClient;

  const key = serverEnv.supabaseServiceRoleKey();

  cachedServiceRoleClient = createClient(getSupabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServiceRoleClient;
}

export function getSupabaseAnonServerClient(): SupabaseClient {
  if (cachedAnonServerClient) return cachedAnonServerClient;

  const anonKey = serverEnv.supabaseAnonKey();

  cachedAnonServerClient = createClient(getSupabaseUrl(), anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedAnonServerClient;
}
