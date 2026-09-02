import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ to the client bundle.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Are the required client‑side vars present? */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Supabase client used throughout the UI. Null if the env vars are missing. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;
