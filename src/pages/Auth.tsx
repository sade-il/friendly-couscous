import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [user, authLoading, navigate, from]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "שגיאת התחברות", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "התחברת בהצלחה" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "שגיאת הרשמה", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "נרשמת בהצלחה",
        description: "בדוק את תיבת המייל שלך כדי לאמת את הכתובת.",
      });
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast({ title: "שגיאת Google", description: String(result.error), variant: "destructive" });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Helmet>
        <title>כניסה והרשמה לאזור האישי | סדצקי הנדסה</title>
        <meta
          name="description"
          content="כניסה והרשמה לאזור האישי של מהנדס המבנים איליה סדצקי — ניהול פניות, מעקב אחר אישורים הנדסיים ומסמכים."
        />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://sade-il.com/auth" />
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="t-h2 mb-2">כניסה והרשמה לאזור האישי</h1>
          <CardTitle className="sr-only">כניסה לאזור האישי</CardTitle>
          <CardDescription>התחבר או צור חשבון חדש</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">התחברות</TabsTrigger>
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">אימייל</Label>
                  <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">סיסמה</Label>
                  <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}התחבר
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">שם תצוגה</Label>
                  <Input id="signup-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">אימייל</Label>
                  <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">סיסמה (לפחות 6 תווים)</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}הירשם
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">או</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            המשך עם Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
