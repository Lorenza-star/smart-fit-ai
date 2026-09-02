import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { getAdminClient } from "../../utils/supabase-admin";
import { requireFounder } from "../../utils/auth";
import type { User } from "@supabase/supabase-js";

/**
 * POST /api/review/:userId – founder decision on a specific profile.
 * Body must contain { decision: "approved"|"rejected"|"needs_info", note?: string }.
 * Updates the profile's risk_status and optional review_note.
 */
export default defineHandler(async (event) => {
  const founder: User = await requireFounder(event);
  const targetId = event.context.params?.userId;
  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: "Target user ID is required." });
  }

  const payload = await readBody<{ decision: string; note?: string }>(event).catch(() => ({}));
  const allowed = ["approved", "rejected", "needs_info"];
  if (!allowed.includes(payload.decision)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid decision value." });
  }
  if ((payload.decision === "rejected" || payload.decision === "needs_info") && (!payload.note || payload.note.trim() === "")) {
    throw createError({ statusCode: 400, statusMessage: "A note is required for rejected or info‑needed decisions." });
  }

  const admin = getAdminClient();
  // Ensure the target profile exists.
  const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", targetId).maybeSingle();
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: "Profile not found." });
  }

  await admin
    .from("profiles")
    .update({ risk_status: payload.decision, review_note: payload.note ?? null })
    .eq("user_id", targetId);

  return { ok: true };
});