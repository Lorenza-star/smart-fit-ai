// Shared domain types: DB row shapes + plan JSON.

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "fat_loss" | "muscle_gain" | "endurance" | "strength" | "general_fitness";
export type RiskStatus = "pending_review" | "approved" | "needs_info" | "rejected";
export type PlanStatus = "generating" | "completed" | "failed" | "superseded";

export interface HealthAnswers {
  age: number;
  activity_level: ActivityLevel;
  goals: Goal[];
  conditions: string[];
  injuries: string;
  chest_pain: boolean;
  fainting: boolean;
  pregnant: boolean;
  recent_surgery_months: number | null;
}

export interface ProfileRow {
  user_id: string;
  email: string | null;
  age: number | null;
  activity_level: ActivityLevel | null;
  goals: Goal[];
  conditions: string[];
  injuries: string;
  chest_pain: boolean;
  fainting: boolean;
  pregnant: boolean;
  recent_surgery_months: number | null;
  health_flags: string[];
  risk_status: RiskStatus;
  review_note: string | null;
  is_founder: boolean;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlanRow {
  id: string;
  user_id: string;
  week_number: number;
  status: PlanStatus;
  error_code: string | null;
  plan_json: unknown;
  context_snapshot: unknown;
  model: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PlanFeedbackRow {
  id: string;
  plan_id: string;
  user_id: string;
  rating: number;
  notes: string;
  days_completed: boolean[];
  submitted_at: string;
}

// Plan JSON validated by planJsonSchema in schemas.ts.
export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_sec: number;
  notes?: string | null;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  duration_min: number;
  exercises: Exercise[];
}

export interface NutritionPlan {
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  hydration_ml: number;
  meals?: (string | null)[] | null;
}

export interface PlanJson {
  summary: string;
  workouts: WorkoutDay[];
  nutrition: NutritionPlan;
  safety_notes?: (string | null)[] | null;
}