import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/** Simple progress component shown while a plan is in the "generating" state. */
export const GenerateProgress = () => {
  const [stage, setStage] = useState(0);
  const stages = ["Contacting advisor…", "Generating your weekly plan…", "Fine‑tuning results…"];

  useEffect(() => {
    const timer = setInterval(() => setStage(prev => Math.min(prev + 1, stages.length - 1)), 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader><CardTitle>Your plan is being generated</CardTitle></CardHeader>
      <CardContent className="flex items-center space-x-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        <span className={cn("text-lg", stage === stages.length - 1 && "font-medium")}>{stages[stage]}</span>
      </CardContent>
    </Card>
  );
};
