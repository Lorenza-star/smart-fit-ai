import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Simple sign‑up page – email + password only (no third‑party). */
export default function Signup() {
  const navigate = useNavigate();

  useEffect(() => {
    // If a session already exists, redirect to the app.
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) navigate("/onboarding");
      });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const form = e.currentTarget as HTMLFormElement;
    const email = (form.email as HTMLInputElement).value;
    const password = (form.password as HTMLInputElement).value;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
      return;
    }

    // If email confirmation is disabled in Supabase, signUp already returns
    // a valid session — go straight into the app instead of telling the
    // user to check an email that will never need to be confirmed.
    if (data.session) {
      navigate("/onboarding");
      return;
    }

    // Otherwise, email confirmation is required — show the hint.
    alert("Check your email for a confirmation link before signing in.");
    navigate("/login");
  };

  if (!supabase) return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Supabase not configured</CardTitle>
        </CardHeader>
        <CardContent>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.</CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-100">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src="/favicon.ico" alt="logo" />
              <AvatarFallback>SF</AvatarFallback>
            </Avatar>
            <span>SmartFit AI – Sign up</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <Button type="submit" className="w-full">
              Sign up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
