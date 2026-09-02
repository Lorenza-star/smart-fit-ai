import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { getAdminClient } from "../../utils/supabase-admin";
import { requireUser } from "../../utils/auth";
import { runPlanGeneration } from "../../utils/generator";
import type { User } from "@supabase/supabase-js";

/**
 * POST /api/plans/generate
 * Starts (or re‑uses) a plan generation job for the authenticated user.
 * Body may contain { mode: "first" | "regenerate" | "next_week" }.
 * Returns { plan_id, status: "generating" }. The client polls GET /api/plans/:id
 * to see when the plan becomes `completed` or `failed`.
 */
export default defineHandler(async (event) => {
  const user: User = await requireUser(event);
  const payload = await readBody<{ mode?: string }>(event).catch(() => ({}));
  const mode = payload?.mode === "regenerate" ? "regenerate" : payload?.mode === "next_week" ? "next_week" : "first";

  const admin = getAdminClient();

  // 1️⃣ Fetch the user's profile – must be onboarding‑done and approved.
  const { data: profile } = await admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile || !profile.onboarding_done) {
    throw createError({ statusCode: 400, statusMessage: "Complete your health check before generating a plan." });
  }
  if (profile.risk_status !== "approved") {
    throw createError({
      statusCode: 403,
      statusMessage: "Plan generation requires founder approval.",
      data: { error_code: "risk_blocked", risk_status: profile.risk_status },
    });
  }

  // 2️⃣ Determine week number & handle existing rows.
  const { data: latestPlans } = await admin
    .from("weekly_plans")
    .select("id, week_number, status")
    .eq("user_id", user.id)
    .order("week_number", { ascending: false })
    .limit(1);
  const latest = latestPlans?.[0] ?? null;

  // If a generation is already in progress, return that plan id.
  if (latest && latest.status === "generating") {
    return { plan_id: latest.id, status: "generating" };
  }

  let weekNumber: number;
  if (latest) {
    if (mode === "regenerate") {
      weekNumber = latest.week_number; // keep same week, supersede later.
    } else if (mode === "next_week") {
      weekNumber = latest.week_number + 1;
    } else {
      // "first" after a completed/failed plan – start next week.
      weekNumber = latest.week_number + 1;
    }
    // If we are regenerating the current week, mark the prior row as superseded.
    if (mode === "regenerate" && latest.status !== "generating") {
      await admin.from("weekly_plans").update({ status: "superseded" }).eq("id", latest.id);
    }
    // If we are starting a new week, also supersede the previous row (if not already).
    if (mode !== "regenerate" && latest.status !== "generating") {
      await admin.from("weekly_plans").update({ status: "superseded" }).eq("id", latest.id);
    }
  } else {
    weekNumber = 1; // brand‑new user.
  }

  // 3️⃣ Insert a new generating row.
  const { data: newPlan, error } = await admin
    .from("weekly_plans")
    .insert({ user_id: user.id, week_number: weekNumber, status: "generating" })
    .select("id, status")
    .single();

  if (error || !newPlan) {
    throw createError({ statusCode: 500, statusMessage: "Could not start plan generation." });
  }

  // 4️⃣ Fire‑and‑forget the generation worker.
  void runPlanGeneration(newPlan.id, user.id);

  return { plan_id: newPlan.id, status: "generating" };
});