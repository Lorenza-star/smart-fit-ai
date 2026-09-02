// Zod schemas shared by client (forms/validation) and server (authoritative).
import { z } from "zod";

export const onboardingSchema = z.object({
  age: z
    .number({ invalid_type_error: "Enter your age" })
    .int("Whole number only")
    .min(16, "Minimum age is 16")
    .max(80, "Maximum age is 80"),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goals: z
    .array(z.enum(["fat_loss", "muscle_gain", "endurance", "strength", "general_fitness"]))
    .min(1, "Pick at least one goal"),
  conditions: z.array(z.string()).max(12).default([]),
  injuries: z.string().max(300).default(""),
  chest_pain: z.boolean().default(false),
  fainting: z.boolean().default(false),
  pregnant: z.boolean().default(false),
  recent_surgery_months: z.number().int().min(1).max(120).nullable().default(null),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const feedbackSchema = z.object({
  plan_id: z.string().uuid(),
  rating: z
    .number({ invalid_type_error: "Please rate your week" })
    .int()
    .min(1, "Rate at least 1 star")
    .max(5, "Max 5 stars"),
  notes: z.string().max(2000).optional().default(""),
  days_completed: z.array(z.boolean()).max(7).optional().default([]),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const planJsonSchema = z.object({
  summary: z.string().min(10).max(600),
  workouts: z
    .array(
      z.object({
        day: z.string().min(1).max(30),
        focus: z.string().min(1).max(120),
        duration_min: z.number().int().min(10).max(180),
        exercises: z
          .array(
            z.object({
              name: z.string().min(1).max(80),
              sets: z.number().int().min(1).max(12),
              reps: z.string().min(1).max(40),
              rest_sec: z.number().int().min(0).max(600),
              notes: z.string().max(200).optional().nullable(),
            }),
          )
          .min(1)
          .max(15),
      }),
    )
    .min(3)
    .max(7),
  nutrition: z.object({
    daily_kcal: z.number().int().min(800).max(7000),
    protein_g: z.number().int().min(20).max(400),
    carbs_g: z.number().int().min(20).max(800),
    fat_g: z.number().int().min(10).max(300),
    hydration_ml: z.number().int().min(500).max(8000),
    meals: z.array(z.string().min(1).max(200)).max(8).optional().nullable(),
  }),
  safety_notes: z.array(z.string().min(1).max(300)).max(8).optional().nullable(),
});

export type PlanJsonSafe = z.infer<typeof planJsonSchema>;

/**
 * Repair pass: the model sometimes wraps JSON in ``` fences or prepends
 * prose. Attempt up-front recovery before failing the plan.
 */
export function safeParsePlan(rawUnknown: unknown): PlanJsonSafe | null {
  let text: string;
  if (typeof rawUnknown === "string") {
    text = rawUnknown.trim();
  } else if (rawUnknown && typeof rawUnknown === "object" && "response" in rawUnknown) {
    const r = (rawUnknown as { response: unknown }).response;
    if (typeof r !== "string") return null;
    text = r;
  } else {
    return null;
  }

  const attempts: string[] = [text];
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) attempts.push(fenceMatch[1].trim());
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    attempts.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const attempt of attempts) {
    try {
      const json = JSON.parse(attempt) as unknown;
      const parsed = planJsonSchema.safeParse(json);
      if (parsed.success) return parsed.data;
    } catch {
      // try next attempt
    }
  }
  return null;
}