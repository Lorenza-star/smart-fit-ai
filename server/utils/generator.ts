import { getAdminClient } from "./supabase-admin";
import { callOllama } from "./ollama";
import { buildGenerationContext } from "./prompt";
import { safeParsePlan } from "../../src/lib/schemas";
import type { ProfileRow, PlanFeedbackRow } from "../../src/lib/types";

/**
 * Core generation worker – runs in the Nitro server process.
 * It never trusts any client‑supplied data; everything (profile, feedback,
 * week number, model) is fetched/derived server‑side.
 */
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

    // 4️⃣ Call Ollama (60 s timeout enforced in callOllama)
    const { text } = await callOllama(prompt);

    // 5️⃣ Validate JSON – one repair attempt is built‑in to safeParsePlan.
    const plan = safeParsePlan(text);
    if (!plan) {
      await admin
        .from("weekly_plans")
        .update({
          status: "failed",
          error_code: "invalid_plan",
          context_snapshot: snapshot,
          completed_at: new Date().toISOString(),
        })
        .eq("id", planId);
      return;
    }

    // 6️⃣ All good → store the completed plan.
    await admin
      .from("weekly_plans")
      .update({
        status: "completed",
        plan_json: plan,
        context_snapshot: snapshot,
        model,
        completed_at: new Date().toISOString(),
      })
      .eq("id", planId);
  } catch (e) {
    // Any unexpected error turns into a failed row with a machine‑readable code.
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
