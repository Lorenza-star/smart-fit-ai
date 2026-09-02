import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
/**
 * Simple auth‑callback placeholder – after a magic‑link sign‑in Supabase will
 * already have stored the session in the browser, so we just redirect to the
 * onboarding flow.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/onboarding");
  }, [navigate]);
  return null;
}
