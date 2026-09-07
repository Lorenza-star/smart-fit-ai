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
 *
 * NOTE: all Supabase reads now go through our own /api/plans/* endpoints
 * instead of the browser talking to Supabase directly.
 *
 * IMPORTANT: we keep the *whole* plan row (id + plan_json), not just the
 * plan_json content, because FeedbackForm needs the real plan id to submit
 * feedback against the correct weekly_plans row.
 */
export default function PlanPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [planRow, setPlanRow] = useState<{ id: string; plan_json: any } | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchLatest = async () => {
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate("/login");
      return;
    }

    const headers = await authHeaders();
    let latestResp: Response;
    try {
      latestResp = await fetch("/api/plans/latest", { headers });
    } catch (e) {
      console.error(e);
      setErrorCode("fetch_error");
      setLoading(false);
      return;
    }
    if (!latestResp.ok) {
      setErrorCode("fetch_error");
      setLoading(false);
      return;
    }
    const { plan: latest, error } = await latestResp.json();
    if (error) {
      console.error(error);
      setErrorCode("fetch_error");
      setLoading(false);
      return;
    }

    if (!latest) {
      const resp = await fetch("/api/plans/generate", { method: "POST", headers });
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
      setPlanRow({ id: latest.id, plan_json: latest.plan_json });
      setLoading(false);
    } else {
      setErrorCode(latest.error_code || "unknown");
      setLoading(false);
    }
  };

  const poll = (planId: string) => {
    const MAX_CONSECUTIVE_FAILURES = 5;
    let consecutiveFailures = 0;

    const interval = setInterval(async () => {
      let resp: Response;
      try {
        const headers = await authHeaders();
        resp = await fetch("/api/plans/latest", { headers });
      } catch (e) {
        consecutiveFailures += 1;
        console.warn(`Poll request failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, e);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          clearInterval(interval);
          setErrorCode("poll_error");
          setLoading(false);
        }
        return;
      }

      if (!resp.ok) {
        consecutiveFailures += 1;
        console.warn(`Poll request failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): HTTP ${resp.status}`);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          clearInterval(interval);
          setErrorCode("poll_error");
          setLoading(false);
        }
        return;
      }

      const { plan: data, error } = await resp.json();
      if (error) {
        consecutiveFailures += 1;
        console.warn(`Poll request failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          clearInterval(interval);
          setErrorCode("poll_error");
          setLoading(false);
        }
        return;
      }

      consecutiveFailures = 0;

      if (!data || (planId && data.id !== planId)) return;

      if (data.status === "completed") {
        clearInterval(interval);
        setPlanRow({ id: data.id, plan_json: data.plan_json });
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
      <PlanView plan={planRow?.plan_json} />
      {planRow?.id && <FeedbackForm planId={planRow.id} workouts={planRow.plan_json?.workouts ?? []} />}
    </AppShell>
  );
}
