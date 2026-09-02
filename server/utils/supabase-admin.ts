import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useRuntimeConfig } from "nitro";

let cached: SupabaseClient | null = null;

/**
 * Service-role client — server only, never import into src/.
 * Bypasses RLS by design; every route must still scope rows by auth.uid().
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const config = useRuntimeConfig();
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      "Server is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.",
    );
  }
  cached = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}