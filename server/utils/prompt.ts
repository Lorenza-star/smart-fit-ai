import type { ProfileRow, PlanFeedbackRow } from "../../src/lib/types";

export interface GenerationInput {
  profile: ProfileRow;
  feedback: PlanFeedbackRow | null;
  weekNumber: number;
  model: string;
}

const JSON_SCHEMA_DESCRIPTION = `{
  "summary": "string (2-3 sentences overview of the week)",
  "workouts": [
    {
      "day": "Monday" | "Tuesday" | ...,
      "focus": "string, e.g. Upper body strength",
      "duration_min": number between 10 and 180,
      "exercises": [
        { "name": "string", "sets": 1..12, "reps": "string e.g. 8-12", "rest_sec": 0..600, "notes": "string, optional" }
      ]
    }
  ] // 3 to 7 days, at least one exercise per day,
  "nutrition": {
    "daily_kcal": number 800..7000,
    "protein_g": number, "carbs_g": number, "fat_g": number,
    "hydration_ml": number,
    "meals": ["string", ...] // optional, max 8
  },
  "safety_notes": ["string", ...] // optional cautions/adaptations
}`;

/**
 * Builds the advisor context from ONLY the current subscriber's own profile
 * and their own latest feedback. Nothing else is ever included.
 */
export function buildGenerationContext(input: GenerationInput): { prompt: string; snapshot: object } {
  const { profile, feedback, weekNumber, model } = input;

  const profileLines = [
    `- Age: ${profile.age}`,
    `- Activity level: ${profile.activity_level}`,
    `- Goals: ${profile.goals.join(", ") || "general fitness"}`,
  ];
  if (profile.conditions.length > 0) {
    profileLines.push(`- Health conditions to respect: ${profile.conditions.join(", ")}`);
  }
  if (profile.injuries.trim()) {
    profileLines.push(`- Injury/limitation notes: ${profile.injuries.trim()}`);
  }

  const feedbackLines = feedback
    ? [
        `- Rating: ${feedback.rating}/5`,
        feedback.notes ? `- Notes: ${feedback.notes}` : null,
        feedback.days_completed.length
          ? `- Days completed: ${feedback.days_completed.filter(Boolean).length}/${feedback.days_completed.length}`
          : null,
      ].filter((l): l is string => l !== null)
    : [];

  const prompt = `You are SmartFit AI, a cautious, evidence-based personal fitness and nutrition advisor.

Rules:
- Design a safe, realistic weekly plan for THIS user only. Never invent medical facts; you are given the health context below and must respect it.
- This is NOT medical advice. If anything would be unsafe, say so in safety_notes and recommend they consult a clinician.
- Keep exercises common and easy to perform with little or no equipment.
- Respond with a single valid JSON object only. No prose, no markdown fences.

The plan is for week ${weekNumber}.

Subscriber profile:
${profileLines.join("\n")}

${feedback ? `Last week's feedback (use it to adjust this week):\n${feedbackLines.join("\n")}` : "No prior feedback yet — this is their starting plan."}

Output JSON must match this shape:
${JSON_SCHEMA_DESCRIPTION}`;

  const snapshot = {
    week_number: weekNumber,
    model,
    context: {
      profile: {
        age: profile.age,
        activity_level: profile.activity_level,
        goals: profile.goals,
        conditions: profile.conditions,
        injuries: profile.injuries,
      },
      feedback: feedback
        ? {
            plan_id: feedback.plan_id,
            rating: feedback.rating,
            notes: feedback.notes,
            days_completed: feedback.days_completed,
          }
        : null,
    },
    generated_at: new Date().toISOString(),
  };

  return { prompt, snapshot };
}