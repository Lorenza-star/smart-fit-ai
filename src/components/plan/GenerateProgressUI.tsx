import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

/**
 * Simple animated placeholder shown while the plan is being generated.
 * Uses three staged messages and a spinner.
 */
export const GenerateProgress = () => {
  const [stage, setStage] = useState(0);
  const stages = ["Contacting advisor…", "Generating your weekly plan…", "Finalizing…"];

  useEffect(() => {
    const timer = setInterval(() => setStage(prev => Math.min(prev + 1, stages.length - 1)), 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center space-x-4">
      <svg className="h-6 w-6 animate-spin text-primary-600" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      </svg>
      <span className={cn("text-lg", stage === stages.length - 1 && "font-medium")}>{stages[stage]}</span>
    </div>
  );
};
