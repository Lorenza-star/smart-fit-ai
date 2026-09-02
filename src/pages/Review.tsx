import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";

/** Founder review queue – list pending profiles with approve/reject actions. */
export default function Review() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const resp = await fetch("/api/review");
      const json = await resp.json();
      setProfiles(json.profiles ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const handleDecision = async (userId: string, decision: string) => {
    const note = decision !== "approved" ? prompt("Please provide a note for the founder decision:") : undefined;
    await fetch(`/api/review/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    setProfiles(profiles.filter(p => p.user_id !== userId));
  };

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
      <Card className="max-w-3xl mx-auto mt-6">
        <CardHeader><CardTitle>Founder review queue</CardTitle></CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p>No pending profiles.</p>
          ) : (
            <ul className="space-y-4">
              {profiles.map(p => (
                <li key={p.user_id} className="border rounded p-4">
                  <strong>{p.email || "(no email)"}</strong><br />
                  Age: {p.age}, Activity: {p.activity_level}<br />
                  Goals: {p.goals?.join(", ")}<br />
                  Flags: {p.health_flags?.join(", ")}<br />
                  Note: {p.review_note && <em>{p.review_note}</em>}
                  <div className="mt-2 space-x-2">
                    <button onClick={() => handleDecision(p.user_id, "approved")} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                    <button onClick={() => handleDecision(p.user_id, "needs_info")} className="px-3 py-1 bg-yellow-600 text-white rounded">Needs info</button>
                    <button onClick={() => handleDecision(p.user_id, "rejected")} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
