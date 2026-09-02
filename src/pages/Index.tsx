import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "../components/Logo";

/** Home/landing page – calm design with CTA to start signup. */
export default function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-primary-100">
      <header className="flex items-center justify-between p-4 bg-primary-600 text-primary-foreground">
        <Link to="/" className="flex items-center space-x-2">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-semibold">SmartFit AI</span>
        </Link>
        <Button asChild size="sm" className="ml-2 bg-primary-500 hover:bg-primary-700 text-white">
          <Link to="/signup">Login / Sign up</Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <Card className="max-w-2xl w-full mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Personalised fitness coaching for busy pros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">
              Stay fit, stay focused, stay safe. Our AI builds a weekly workout + nutrition plan just for you, based on your health profile.
            </p>
            <Button asChild className="w-full">
              <Link to="/signup">Get started for RM49/mo</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
