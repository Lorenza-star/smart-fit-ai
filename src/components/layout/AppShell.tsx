import { Link, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { Logo } from "../Logo";
import { Button } from "@/components/ui/button";

/** Simple page shell with a header (logo + sign‑out) and container. */
export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary-100">
      <header className="flex items-center justify-between p-4 bg-[#0E9488] text-white">
        <Link to="/" className="flex items-center space-x-2">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-semibold">SmartFit AI</span>
        </Link>
        {isSupabaseConfigured && (
                  <>
                    <Link to="/dashboard" className="text-white hover:underline mr-2">
                      Dashboard
                    </Link>
                    <Link to="/history" className="text-white hover:underline mr-2">
                      History
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-primary-foreground">
                      Sign out
                    </Button>
                  </>
                )}
      </header>
      <main className={cn("flex-1 container mx-auto p-4", "max-w-3xl")}>{children}</main>
    </div>
  );
};
