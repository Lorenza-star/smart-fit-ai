import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";

interface DashboardKpis {
  completion_rate_pct: number | null;
  avg_rating: number | null;
  streak_weeks: number | null;
  this_week_minutes: number | null;
  this_week_days: number | null;
}

/**
 * Dashboard page – shows 4 KPI cards computed server-side (see
 * GET /api/dashboard) and lets the user export their latest weekly plan
 * as a JSON file. All Supabase reads happen on the server; the browser
 * only talks to our own API, consistent with the rest of the app.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadKpis = async () => {
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = await authHeaders();
      const resp = await fetch("/api/dashboard", { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as DashboardKpis;
      setKpis(data);
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch("/api/plans/latest", { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { plan } = await resp.json();
      if (!plan?.plan_json) {
        setErrorMsg("No completed plan available to export yet.");
        return;
      }
      const blob = new Blob([JSON.stringify(plan.plan_json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smartfit-weekly-plan-${plan.id ?? "latest"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setErrorMsg("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadKpis();
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
        <div className="flex flex-col items-center justify-center mt-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your dashboard…</span>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Dashboard</h1>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting…" : "Export latest plan (JSON)"}
          </Button>
        </div>

        {errorMsg && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6 text-destructive">{errorMsg}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Completion rate"
            value={kpis?.completion_rate_pct != null ? `${kpis.completion_rate_pct}%` : "—"}
            hint="Days completed, most recent week"
          />
          <KpiCard
            label="Average rating"
            value={kpis?.avg_rating != null ? `${kpis.avg_rating} / 5` : "—"}
            hint="Across all submitted feedback"
          />
          <KpiCard
            label="Current streak"
            value={kpis?.streak_weeks != null ? `${kpis.streak_weeks} week${kpis.streak_weeks === 1 ? "" : "s"}` : "—"}
            hint="Consecutive completed weeks"
          />
          <KpiCard
            label="This week's volume"
            value={
              kpis?.this_week_minutes != null
                ? `${kpis.this_week_minutes} min${kpis.this_week_days != null ? ` · ${kpis.this_week_days} days` : ""}`
                : "—"
            }
            hint="Planned training time"
          />
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground mt-2">{hint}</div>
      </CardContent>
    </Card>
  );
}
