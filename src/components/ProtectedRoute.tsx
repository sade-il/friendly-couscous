import { ReactNode, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Require email verification (skip for OAuth users where email is auto-confirmed)
  const isEmailVerified =
    !!user.email_confirmed_at ||
    user.app_metadata?.provider !== "email";

  if (!isEmailVerified) {
    const handleResend = async () => {
      if (!user.email) return;
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}${location.pathname}` },
      });
      setResending(false);
      if (error) {
        toast({ title: "שגיאה בשליחה", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "מייל אימות נשלח", description: "בדוק את תיבת הדואר שלך." });
      }
    };

    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4 border rounded-lg p-8 bg-card">
          <MailCheck className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">נדרש אימות מייל</h1>
          <p className="text-muted-foreground">
            שלחנו קישור אימות לכתובת <strong>{user.email}</strong>. אנא לחץ על הקישור במייל
            כדי לאמת את החשבון ולקבל גישה לדף זה.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleResend} disabled={resending}>
              {resending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              שלח מייל אימות שוב
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              אימתתי — רענן
            </Button>
            <Button variant="ghost" onClick={signOut}>
              התנתק
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-2xl font-bold">אין הרשאה</h1>
          <p className="text-muted-foreground">דף זה זמין למנהלים בלבד.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
