import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkoutDay {
  day: string;
  focus?: string;
}

/**
 * Feedback form – submits rating, notes and per-day completion checkboxes.
 * Directly inserts into the plan_feedback table (RLS ensures row ownership).
 *
 * `workouts` is the list of this week's planned workout days (from
 * plan_json.workouts), used to render one "did you complete this day?"
 * checkbox per planned day — this is what actually populates
 * days_completed, which the Dashboard's "Completion rate" KPI reads.
 */
export const FeedbackForm = ({
  planId,
  workouts = [],
}: {
  planId: string;
  workouts?: WorkoutDay[];
}) => {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<boolean[]>(() => workouts.map(() => false));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleDay = (index: number) => {
    setDays((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      alert("Not signed in.");
      return;
    }

    const { error } = await supabase.from("plan_feedback").upsert(
      {
        plan_id: planId,
        user_id: user.id,
        rating,
        notes,
        days_completed: days,
      },
      { onConflict: "plan_id,user_id" },
    );
    setSubmitting(false);
    if (error) {
      alert(error.message);
    } else {
      setSubmitted(true);
    }
  };

  if (!supabase) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle>Supabase not configured</CardTitle>
        </CardHeader>
        <CardContent>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.</CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="max-w-md mx-auto mt-6">
        <CardHeader>
          <CardTitle>Thank you for your feedback!</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-6">
      <CardHeader>
        <CardTitle>Give feedback for this week</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            Rating (1-5):
            <input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value) || 0)}
              required
              className="mt-1 w-full rounded border p-2"
            />
          </label>

          {workouts.length > 0 && (
            <div>
              <span className="block mb-2 font-medium">Which days did you complete?</span>
              <div className="space-y-2">
                {workouts.map((w, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={days[i] ?? false}
                      onChange={() => toggleDay(i)}
                      className="h-4 w-4"
                    />
                    <span>
                      {w.day}
                      {w.focus ? ` — ${w.focus}` : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            Notes (optional):
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting…" : "Submit feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
