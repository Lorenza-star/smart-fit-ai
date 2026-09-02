// POST /api/onboarding — accept health-check answers, run the risk screen,
// persist the profile server-side (authoritative). Never trust client flags.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { getAdminClient } from "../../utils/supabase-admin";
import { requireUser } from "../../utils/auth";
import { onboardingSchema } from "../../../src/lib/schemas";
import { computeHealthFlags, computeRiskStatus } from "../../../src/lib/risk";

export default defineHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<unknown>(event);

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: "Some answers were invalid. Please review and resubmit.",
      data: { details: parsed.error.flatten() },
    });
  }
  const answers = parsed.data;

  const healthFlags = computeHealthFlags(answers);
  const riskStatus = computeRiskStatus(healthFlags);

  const admin = getAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        email: user.email,
        age: answers.age,
        activity_level: answers.activity_level,
        goals: answers.goals,
        conditions: answers.conditions,
        injuries: answers.injuries,
        chest_pain: answers.chest_pain,
        fainting: answers.fainting,
        pregnant: answers.pregnant,
        recent_surgery_months: answers.recent_surgery_months,
        health_flags: healthFlags,
        risk_status: riskStatus,
        review_note: null,
        onboarding_done: true,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !profile) {
    throw createError({ statusCode: 500, statusMessage: "Could not save your health check." });
  }

  return { profile };
});