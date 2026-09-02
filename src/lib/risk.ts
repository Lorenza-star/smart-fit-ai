// Deterministic risk engine — pure logic, no I/O.
// Shared by the client wizard (live preview) and the server (authoritative).

import type { RiskStatus, HealthAnswers } from "./types";

export const FLAG_LABELS: Record<string, string> = {
  pregnancy: "Pregnancy",
  cardiac: "Heart-related concerns (chest pain / fainting)",
  recent_surgery: "Recent surgery (< 3 months)",
  injuries_reported: "Current injuries or limitations reported",
  chronic_condition: "Chronic condition requiring monitoring",
  sedentary_senior: "Age 60+ and currently sedentary",
};

export function computeHealthFlags(a: HealthAnswers): string[] {
  const flags: string[] = [];

  if (a.pregnant) flags.push("pregnancy");
  if (a.chest_pain || a.fainting) flags.push("cardiac");
  if (a.recent_surgery_months !== null && a.recent_surgery_months < 3) {
    flags.push("recent_surgery");
  }
  if (a.injuries.trim().length > 0) flags.push("injuries_reported");
  if (
    a.conditions.includes("heart_disease") ||
    a.conditions.includes("hypertension") ||
    a.conditions.includes("diabetes")
  ) {
    flags.push("chronic_condition");
  }
  if (a.age >= 60 && a.activity_level === "sedentary") {
    flags.push("sedentary_senior");
  }

  return flags;
}

export function computeRiskStatus(flags: string[]): RiskStatus {
  return flags.length > 0 ? "pending_review" : "approved";
}

// Goal labels used by the wizard and plan views.
export const GOAL_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "fat_loss", label: "Lose fat", hint: "Leaner, lighter" },
  { value: "muscle_gain", label: "Build muscle", hint: "Strength & size" },
  { value: "endurance", label: "Improve endurance", hint: "Stamina & cardio" },
  { value: "strength", label: "Get stronger", hint: "Heavier lifts" },
  { value: "general_fitness", label: "General fitness", hint: "Feel great daily" },
];

export const CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: "asthma", label: "Asthma" },
  { value: "heart_disease", label: "Heart condition" },
  { value: "hypertension", label: "High blood pressure" },
  { value: "diabetes", label: "Diabetes" },
  { value: "back_pain", label: "Back pain" },
  { value: "knee_pain", label: "Knee pain" },
  { value: "none", label: "None of these" },
];

export const ACTIVITY_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little movement" },
  { value: "light", label: "Lightly active", hint: "1–2 light sessions/week" },
  { value: "moderate", label: "Moderately active", hint: "2–3 sessions/week" },
  { value: "active", label: "Active", hint: "3–5 sessions/week" },
  { value: "very_active", label: "Very active", hint: "6+ sessions/week" },
];