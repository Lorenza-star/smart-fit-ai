import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/layout/AppShell";
import { Loader2 } from "lucide-react";

/** Simple pending‑review notice for high‑risk users. */
export default function Pending() {
  const [note, setNote] = useState("");

  useEffect(() => {
    const fetchNote = async () => {
      const { data: session } = await supabase!.auth.getSession();
      if (!session.session) return;
      const { data, error } = await supabase!
        .from("profiles")
        .select("review_note")
        .eq("user_id", session.session.user.id)
        .maybeSingle();
      if (!error && data?.review_note) setNote(data.review_note);
    };
    fetchNote();
  }, []);

  return (
    <AppShell>
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader><CardTitle>Your health check requires founder review</CardTitle></CardHeader>
        <CardContent>
          <p>The system flagged a potential high‑risk condition. A founder will review your questionnaire and approve the plan manually.</p>
          {note && (
            <p className="mt-4 border-l-4 pl-2 italic">
              <strong>Founder note:</strong> {note}
            </p>
          )}
          <p className="mt-4">You can safely close this tab – you will be notified via email when the plan is ready.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
