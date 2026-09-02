import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "../../lib/utils";
import { NutritionPlan } from "../../lib/types";

export const NutritionCard = ({ nutrition }: { nutrition: NutritionPlan }) => (
  <Card className="mb-4">
    <CardHeader><CardTitle>Nutrition overview</CardTitle></CardHeader>
    <CardContent>
      <ul className="list-disc pl-5 space-y-1">
        <li>Calories: {nutrition.daily_kcal} kcal</li>
        <li>Protein: {nutrition.protein_g} g</li>
        <li>Carbs: {nutrition.carbs_g} g</li>
        <li>Fat: {nutrition.fat_g} g</li>
        <li>Hydration: {nutrition.hydration_ml} ml</li>
      </ul>
    </CardContent>
  </Card>
);
