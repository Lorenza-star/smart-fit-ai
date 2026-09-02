import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { HealthCheckWizard } from "../components/onboarding/HealthCheckWizard";

/**
 * Onboarding page – checks auth, then shows the health‑check wizard.
 * If a profile already exists and risk_status is approved, jump straight
 * to the plan page.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!supabase) return;
    const fetch = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/login");
        return;
      }
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", session.session.user.id).maybeSingle();
      if (error) {
        console.error(error);
        setProfile(null);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };
    fetch();
  }, [navigate]);

  if (!supabase) {
    return (
      <AppShell>
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader><CardTitle>Supabase not configured</CardTitle></CardHeader>
          <CardContent>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.</CardContent>
        </Card>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </AppShell>
    );
  }

  // If a profile exists and the founder already approved it → go straight to plan.
  if (profile && profile.risk_status === "approved") {
    navigate("/plan");
    return null;
  }

  // If the profile exists but is pending_review → show the pending page.
  if (profile && profile.risk_status !== "approved") {
    navigate("/pending");
    return null;
  }

  // Otherwise, no profile yet – show the wizard.
  return (
    <AppShell>
      <Card className="max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Welcome! Let’s build your fitness profile</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthCheckWizard />
        </CardContent>
      </Card>
    </AppShell>
  );
}
