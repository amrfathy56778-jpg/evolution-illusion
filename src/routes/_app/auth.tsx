import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/_app/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" ? { next: s.next } : {},

  head: () => ({ meta: [{ title: "تسجيل الدخول · وهم التطور" }] }),
});

/** Only same-origin relative paths are accepted as a post-login destination. */
function safeNext(next?: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { next } = Route.useSearch();
  const target = safeNext(next);

  const goNext = () => {
    if (target) { window.location.href = target; return; }
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (user) goNext();
  }, [user]);

  const google = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: target ? window.location.origin + target : window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error(result.error.message ?? "تعذّر الدخول بحساب Google");
        return;
      }
      if (result.redirected) return;
      toast.success("أهلاً بعودتك");
      goNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-gradient-emerald">تسجيل الدخول</h1>
        <p className="text-xs text-muted-foreground">
          المشرفون يستعيدون صلاحياتهم تلقائياً عند الدخول
        </p>
      </div>

      <div className="glass rounded-3xl p-6">
        <button
          onClick={google}
          disabled={loading}
          className="w-full glass-input rounded-xl py-3 px-4 font-semibold text-sm hover:bg-white/10 transition flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? "جارٍ المتابعة…" : "الدخول بحساب Google"}
        </button>
      </div>

      <Link to="/" className="block text-center glass rounded-2xl py-3 text-xs font-semibold hover:bg-white/5 transition">
        <Eye className="h-3.5 w-3.5 inline ml-1" /> الدخول كضيف (تصفح فقط)
      </Link>
    </div>
  );
}
