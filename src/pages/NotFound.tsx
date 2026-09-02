import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";

/** Simple 404 page matching the calm visual language */
export default function NotFound() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-screen bg-primary-100">
        <img src="/favicon.ico" alt="SmartFit AI logo" className="h-12 w-12 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="mb-4">Sorry, we couldn’t find what you’re looking for.</p>
        <Button onClick={() => navigate('/')}>Return home</Button>
      </div>
    </AppShell>
  );
}
