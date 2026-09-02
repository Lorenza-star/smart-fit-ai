import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "../../lib/utils";
import { Exercise, WorkoutDay } from "../../lib/types";

/** Render a single day's workout in a clean card. */
export const WorkoutDayCard = ({ day }: { day: WorkoutDay }) => (
  <Card className="mb-4">
    <CardHeader>
      <CardTitle className="flex justify-between">
        {day.day}
        <span className="text-sm text-muted-foreground">{day.duration_min} min</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="font-medium mb-2">{day.focus}</p>
      <ul className="list-disc pl-5 space-y-1">
        {day.exercises.map((ex, i) => (
          <li key={i}>
            {ex.name} – {ex.sets}×{ex.reps} ({ex.rest_sec}s rest)
            {ex.notes ? <span className="ml-2 text-muted-foreground">({ex.notes})</span> : null}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);
