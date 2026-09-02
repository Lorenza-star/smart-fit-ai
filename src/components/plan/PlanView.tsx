import { WorkoutDayCard } from "./WorkoutDayCard";
import { NutritionCard } from "./NutritionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "../../lib/utils";
import type { PlanJson } from "../../lib/types";

/** Render the whole weekly plan – workouts per day + nutrition block. */
export const PlanView = ({ plan }: { plan: PlanJson }) => {
  if (!plan) return null;

  return (
    <Card className="max-w-2xl mx-auto mt-6">
      <CardHeader><CardTitle>Your weekly plan</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4">{plan.summary}</p>
        {plan.workouts.map((day, idx) => (
          <WorkoutDayCard key={idx} day={day} />
        ))}
        <NutritionCard nutrition={plan.nutrition} />
        {plan.safety_notes && plan.safety_notes.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold">Safety notes</h3>
            <ul className="list-disc pl-5">
              {plan.safety_notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
