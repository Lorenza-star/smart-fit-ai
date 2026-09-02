import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { getAdminClient } from "../../../utils/supabase-admin";
import { requireUser } from "../../../utils/auth";
import type { User } from "@supabase/supabase-js";

/**
 * GET /api/plans/:id – fetch a specific plan for the authenticated user.
 * Returns the raw row (including status, error_code, plan_json, etc.).
 * If the row is still `generating` and older than 90 seconds, it is marked
 * failed with `ollama_timeout` – this handles server restarts or a hung
 * Ollama process.
 */
export default defineHandler(async (event) => {
  const user: User = await requireUser(event);
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Plan ID is required." });
  }

  const admin = getAdminClient();
  const { data: plan } = await admin.from("weekly_plans").select("*").eq("id", id).maybeSingle();
  if (!plan || plan.user_id !== user.id) {
    throw createError({ statusCode: 404, statusMessage: "Plan not found." });
  }

  // Staleness guard for generating rows.
  if (plan.status === "generating") {
    const ageMs = Date.now() - new Date(plan.created_at).getTime();
    if (ageMs > 90_000) {
      await admin
        .from("weekly_plans")
        .update({ status: "failed", error_code: "ollama_timeout", completed_at: new Date().toISOString() })
        .eq("id", id);
      // Refetch after update.
      const { data: refreshed } = await admin.from("weekly_plans").select("*").eq("id", id).maybeSingle();
      return { plan: refreshed };
    }
  }

  return { plan };
});