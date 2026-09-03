import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PlanView } from "../components/plan/PlanView";
import { GenerateProgress } from "../components/plan/GenerateProgress";
import { FeedbackForm } from "../components/plan/FeedbackForm";
import { Button } from "@/components/ui/button";

/**
 * Plan page – displays the latest weekly plan (or starts generation).
 * Polls the server for plan status until it is `completed` or `failed`.
 */
export default function PlanPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Helper to fetch the latest plan for the user.
  const fetchLatest = async () => {
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate("/login");
      return;
    }
    const { data: latest, error } = await supabase
      .from("weekly_plans")
      .select("id, status, error_code, plan_json")
      .eq("user_id", session.session.user.id)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(error);
      setErrorCode("fetch_error");
      setLoading(false);
      return;
    }
    if (!latest) {
      // No plan yet – kick off generation via server endpoint.
      if (!latest) {
  // No plan yet – kick off generation via server endpoint.
  const { data: sessionData } = await supabase.auth.getSession();
  const resp = await fetch("/api/plans/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
  });
  const data = await resp.json();
  if (data.plan_id) {
    poll(data.plan_id);
  } else {
    setErrorCode("gen_start_error");
    setLoading(false);
  }
}
      const data = await resp.json();
      if (data.plan_id) {
        poll(data.plan_id);
      } else {
        setErrorCode("gen_start_error");
        setLoading(false);
      }
    } else if (latest.status === "generating") {
      poll(latest.id);
    } else if (latest.status === "completed") {
      setPlan(latest.plan_json);
      setLoading(false);
    } else {
      setErrorCode(latest.error_code || "unknown");
      setLoading(false);
    }
  };

  // Poll the plan status every 1.5 s. Tolerates transient network blips:
  // a single failed request no longer kills the flow — only MAX_CONSECUTIVE_FAILURES
  // in a row (default 5, ~7.5s of continuous failure) triggers poll_error.
  const poll = (planId: string) => {
    const MAX_CONSECUTIVE_FAILURES = 5;
    let consecutiveFailures = 0;

    const interval = setInterval(async () => {
      const { data, error } = await supabase!
        .from("weekly_plans")
        .select("status, error_code, plan_json")
        .eq("id", planId)
        .maybeSingle();

      if (error) {
        consecutiveFailures += 1;
        console.warn(`Poll request failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          clearInterval(interval);
          setErrorCode("poll_error");
          setLoading(false);
        }
        // Otherwise: swallow this failure and let the next tick retry.
        return;
      }

      // A successful request resets the failure streak.
      consecutiveFailures = 0;

      if (!data) return;
      if (data.status === "completed") {
        clearInterval(interval);
        setPlan(data.plan_json);
        setLoading(false);
      } else if (data.status === "failed") {
        clearInterval(interval);
        setErrorCode(data.error_code || "failed");
        setLoading(false);
      }
    }, 1500);
  };

  useEffect(() => {
    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supabase) {
    return (
      <AppShell>
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle>Supabase not configured</CardTitle>
          </CardHeader>
          <CardContent>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.</CardContent>
        </Card>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <GenerateProgress />
      </AppShell>
    );
  }

  if (errorCode) {
    return (
      <AppShell>
        <Card className="max-w-lg mx-auto mt-10">
          <CardHeader>
            <CardTitle>Plan generation error</CardTitle>
          </CardHeader>
          <CardContent>
            Something went wrong: {errorCode}. You can try to <Button onClick={() => window.location.reload()}>retry</Button>.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PlanView plan={plan} />
      <FeedbackForm planId={plan?.id} />
    </AppShell>
  );
}
