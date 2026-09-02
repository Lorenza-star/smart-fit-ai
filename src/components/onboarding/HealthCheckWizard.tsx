import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "../../lib/utils";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, CONDITION_OPTIONS } from "../../lib/risk";

/**
 * Multi‑step health‑check wizard used on the onboarding page.
 * Collects age, activity, goals, conditions, injuries, and a few risk flags.
 * On final submit it POSTs to the server‑side /api/onboarding endpoint.
 */
export const HealthCheckWizard = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [age, setAge] = useState(30);
  const [activity, setActivity] = useState(ACTIVITY_OPTIONS[0].value);
  const [goals, setGoals] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");
  const [chestPain, setChestPain] = useState(false);
  const [fainting, setFainting] = useState(false);
  const [pregnant, setPregnant] = useState(false);
  const [recentSurgeryMonths, setRecentSurgeryMonths] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    if (!supabase) {
      setError("Supabase not configured.");
      setSubmitting(false);
      return;
    }
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setError("Session missing – please sign in again.");
      setSubmitting(false);
      return;
    }
    console.log('Onboarding payload:', payload);
      age,
      activity_level: activity,
      goals,
      conditions,
      injuries,
      chest_pain: chestPain,
      fainting,
      pregnant,
      recent_surgery_months: recentSurgeryMonths ? parseInt(recentSurgeryMonths) : null,
    };
    try {
      console.log('Onboarding payload:', payload);
      const resp = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      console.log('Onboarding response status:', resp.status);
      const json = await resp.json();
      console.log('Onboarding response body:', json);
      if (!resp.ok) throw new Error(json?.message || "Server error");
      const status = json.profile?.risk_status;
      if (status === "pending_review") navigate("/pending");
      else navigate("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Age</Label>
                <Input type="number" min={16} max={80} value={age} onChange={(e) => setAge(parseInt(e.target.value) || 0)} required />
              </div>
              <div>
                <Label>Activity level</Label>
                <RadioGroup value={activity} onValueChange={setActivity}>
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={opt.value} />
                      <Label htmlFor={opt.value}>{opt.label}</Label>
                      <span className="text-sm text-muted-foreground">{opt.hint}</span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Goals (pick at least one)</Label>
                {GOAL_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={opt.value}
                      checked={goals.includes(opt.value)}
                      onCheckedChange={(c) => setGoals(toggleArray(goals, opt.value))}
                    />
                    <Label htmlFor={opt.value}>{opt.label}</Label>
                    <span className="text-sm text-muted-foreground">{opt.hint}</span>
                  </div>
                ))}
              </div>
              <div>
                <Label>Existing health conditions (optional)</Label>
                {CONDITION_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={opt.value}
                      checked={conditions.includes(opt.value)}
                      onCheckedChange={(c) => setConditions(toggleArray(conditions, opt.value))}
                    />
                    <Label htmlFor={opt.value}>{opt.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="injuries">Current injuries / limitations (optional)</Label>
                <Input id="injuries" value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder="e.g. occasional knee pain" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="chestPain" checked={chestPain} onCheckedChange={(c) => setChestPain(!!c)} />
                <Label htmlFor="chestPain">Chest pain / tightness</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="fainting" checked={fainting} onCheckedChange={(c) => setFainting(!!c)} />
                <Label htmlFor="fainting">Recent fainting episodes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="pregnant" checked={pregnant} onCheckedChange={(c) => setPregnant(!!c)} />
                <Label htmlFor="pregnant">Pregnant</Label>
              </div>
              <div>
                <Label htmlFor="recentSurgeryMonths">Recent surgery (months ago, if any)</Label>
                <Input
                  id="recentSurgeryMonths"
                  type="number"
                  min={1}
                  value={recentSurgeryMonths}
                  onChange={(e) => setRecentSurgeryMonths(e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Finish & generate plan"}
              </Button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="text-xl">Health‑check questionnaire</CardTitle>
      </CardHeader>
      <CardContent>{renderStep()}</CardContent>
    </Card>
  );
};
