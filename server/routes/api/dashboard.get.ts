import { defineHandler } from "nitro";
import { getAdminClient } from "../../utils/supabase-admin";
import { requireUser } from "../../utils/auth";

/**
 * GET /api/dashboard
 * Computes 4 KPIs for the authenticated user from their own weekly_plans
 * and plan_feedback rows only. All computation happens server-side so the
 * browser never needs to query Supabase directly.
 *
 * KPIs:
 * 1. completion_rate_pct   – % of days completed in the most recent feedback
 * 2. avg_rating            – average star rating across all feedback (1-5)
 * 3. streak_weeks          – consecutive most-recent weeks with status "completed"
 * 4. this_week_minutes     – total planned training minutes in the latest completed plan
 */
export default defineHandler(async (event) => {
  const user = await requireUser(event);
  const admin = getAdminClient();

  const [{ data: plans }, { data: feedbackRows }] = await Promise.all([
    admin
      .from("weekly_plans")
      .select("id, week_number, status, plan_json")
      .eq("user_id", user.id)
      .order("week_number", { ascending: false })
      .limit(52), // cap: ~1 year of weekly plans is plenty for a streak calc
    admin
      .from("plan_feedback")
      .select("rating, days_completed, submitted_at")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false }),
  ]);

  const allPlans = plans ?? [];
  const allFeedback = feedbackRows ?? [];

  // 1️⃣ Completion rate — from the most recent feedback row.
  let completionRatePct: number | null = null;
  if (allFeedback.length > 0) {
    const latest = allFeedback[0];
    const days = latest.days_completed ?? [];
    if (days.length > 0) {
      const completedCount = days.filter(Boolean).length;
      completionRatePct = Math.round((completedCount / days.length) * 100);
    }
  }

  // 2️⃣ Average rating across all feedback.
  let avgRating: number | null = null;
  if (allFeedback.length > 0) {
    const sum = allFeedback.reduce((acc, f) => acc + (f.rating ?? 0), 0);
    avgRating = Math.round((sum / allFeedback.length) * 10) / 10; // 1 decimal place
  }

  // 3️⃣ Streak — consecutive most-recent weeks with status "completed",
  // walking backwards from the highest week_number until a gap or a
  // non-completed week is found.
  let streakWeeks = 0;
  const sortedByWeekDesc = [...allPlans].sort((a, b) => b.week_number - a.week_number);
  let expectedWeek: number | null = null;
  for (const plan of sortedByWeekDesc) {
    if (expectedWeek === null) {
      if (plan.status !== "completed") break;
      streakWeeks = 1;
      expectedWeek = plan.week_number - 1;
      continue;
    }
    if (plan.week_number !== expectedWeek || plan.status !== "completed") break;
    streakWeeks += 1;
    expectedWeek -= 1;
  }

  // 4️⃣ This week's training volume — total minutes from the latest completed plan.
  let thisWeekMinutes: number | null = null;
  let thisWeekDays: number | null = null;
  const latestCompleted = sortedByWeekDesc.find((p) => p.status === "completed" && p.plan_json);
  if (latestCompleted?.plan_json) {
    const workouts = (latestCompleted.plan_json as any)?.workouts;
    if (Array.isArray(workouts)) {
      thisWeekMinutes = workouts.reduce((acc: number, w: any) => acc + (Number(w?.duration_min) || 0), 0);
      thisWeekDays = workouts.length;
    }
  }

  return {
    completion_rate_pct: completionRatePct,
    avg_rating: avgRating,
    streak_weeks: streakWeeks,
    this_week_minutes: thisWeekMinutes,
    this_week_days: thisWeekDays,
  };
});
