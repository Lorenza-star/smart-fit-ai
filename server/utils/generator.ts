import { getAdminClient } from "./supabase-admin";
import { callOllama } from "./ollama";
import { buildGenerationContext } from "./prompt";
import { safeParsePlan } from "../../src/lib/schemas";
import type { ProfileRow, PlanFeedbackRow } from "../../src/lib/types";

export async function runPlanGeneration(planId: string, userId: string): Promise<void> {
  const admin = getAdminClient();
  const model = process.env.OLLAMA_MODEL ?? "llama3.1";

  try {
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
      await admin
        .from("weekly_plans")
        .update({ status: "failed", error_code: "missing_profile", completed_at: new Date().toISOString() })
        .eq("id", planId);
      return;
    }

    const { data: planRow } = await admin.from("weekly_plans").select("week_number").eq("id", planId).maybeSingle();
    const weekNumber = planRow?.week_number ?? 1;

    const { prompt, snapshot } = buildGenerationContext({
      profile: profile as ProfileRow,
      feedback: feedback as PlanFeedbackRow | null,
      weekNumber,
      model,
    });

    const { text } = await callOllama(prompt);

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
