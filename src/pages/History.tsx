import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/layout/AppShell";
import { Loader2 } from "lucide-react";

/** Simple history page – list past completed plans. */
export default function History() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase!.auth.getSession();
      if (!session.session) return;
      const { data, error } = await supabase!
        .from("weekly_plans")
        .select("id, week_number, created_at, plan_json")
        .eq("user_id", session.session.user.id)
        .order("week_number", { ascending: false })
        .not("status", "eq", "generating");
      if (!error) setPlans(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Card className="max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Your past plans</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p>No past plans yet. Complete your first plan to see history.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="border rounded p-2">
                  <strong>Week {p.week_number}</strong> – {new Date(p.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
