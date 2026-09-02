import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { getAdminClient } from "../../utils/supabase-admin";
import { requireFounder } from "../../utils/auth";

/**
 * GET /api/review – founder queue of all profiles needing review.
 * Returns an array of profile rows (including email, health flags, etc.)
 * – only accessible to a user whose own profile has is_founder = true.
 */
export default defineHandler(async (event) => {
  await requireFounder(event);

  const admin = getAdminClient();
  const { data: pending } = await admin
    .from("profiles")
    .select("*")
    .in("risk_status", ["pending_review", "needs_info", "rejected"])
    .order("created_at", { ascending: false });

  return { profiles: pending ?? [] };
});