import { getAdminClient } from "./supabase-admin";
import { callOllama } from "./ollama";
import { buildGenerationContext } from "./prompt";
import { safeParsePlan } from "../../src/lib/schemas";
import type { ProfileRow, PlanFeedbackRow } from "../../src/lib/types";

/**
 * Core generation worker – runs in the Nitro server process.
 * It never trusts any client‑supplied data; everything (profile, feedback,
 * week number, model) is fetched/derived server‑side.
 *
 * Ollama generation is non-deterministic (temperature 0.7), so the model
 * occasionally returns text that doesn't pass safeParsePlan (extra prose,
 * a field slightly out of range, etc). Rather than fail the whole plan on
 * the first bad output, we retry a bounded number of times before giving
 * up — this mirrors what a human would do (just ask again).
 */
const MAX_GENERATION_ATTEMPTS = 3;

export async function runPlanGeneration(planId: string, userId: string): Promise<void> {
  const admin = getAdminClient();
  const model = process.env.OLLAMA_MODEL ?? "llama3.1";

  try {
    // 1️⃣ Fetch the user's profile and latest feedback (if any)
    const [{ data: profile }, { data: feedback }] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin
        .from("plan_feedback")
        .select("*")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!profile) {
      // If somehow the profile vanished, fail the plan.
      await admin
        .from("weekly_plans")
        .update({ status: "failed", error_code: "missing_profile", completed_at: new Date().toISOString() })
        .eq("id", planId);
      return;
    }

    // 2️⃣ Grab the week number from the plan row we just created.
    const { data: planRow } = await admin.from("weekly_plans").select("week_number").eq("id", planId).maybeSingle();
    const weekNumber = planRow?.week_number ?? 1;

    // 3️⃣ Build the prompt + a snapshot for audit.
    const { prompt, snapshot } = buildGenerationContext({
      profile: profile as ProfileRow,
      feedback: feedback as PlanFeedbackRow | null,
      weekNumber,
      model,
    });

    // 4️⃣ Call Ollama, retrying up to MAX_GENERATION_ATTEMPTS times if the
    // response doesn't pass validation. Each attempt is a fresh call, so a
    // transient bad output on attempt 1 doesn't doom the whole generation.
    let lastRawText = "";
    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      const { text } = await callOllama(prompt);
      lastRawText = text;

      const plan = safeParsePlan(text);
      if (plan) {
        // Success — store the completed plan and stop retrying.
        await admin
          .from("weekly_plans")
          .update({
            status: "completed",
            plan_json: plan,
            context_snapshot: { ...snapshot, generation_attempts: attempt },
            model,
            completed_at: new Date().toISOString(),
          })
          .eq("id", planId);
        return;
      }

      console.warn(`[generator] attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} failed safeParsePlan validation.`);
    }

    // All attempts exhausted — fail the plan for real.
    await admin
      .from("weekly_plans")
      .update({
        status: "failed",
        error_code: "invalid_plan",
        context_snapshot: {
          ...snapshot,
          generation_attempts: MAX_GENERATION_ATTEMPTS,
          debug_raw_output: lastRawText.slice(0, 4000),
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", planId);
  } catch (e) {
    // Any unexpected error (network, timeout, auth, etc.) turns into a
    // failed row with a machine‑readable code. These are not retried here
    // since callOllama() already enforces its own timeout per attempt.
    const code = (e as any)?.code ?? "ollama_error";
    await admin
      .from("weekly_plans")
      .update({
        status: "failed",
        error_code: code,
        completed_at: new Date().toISOString(),
      })
      .eq("id", planId);
  }
}
