import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, BookOpen, Users, MessageCircle, ArrowLeft } from "lucide-react";
import { AISearchButton } from "@/components/AISearchDialog";

export const Route = createFileRoute("/_app/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "وهم التطور — الرئيسية" },
      { name: "description", content: "منصة علمية للنقد المنهجي لنظرية التطور، مدعومة بأحدث إصدارات Gemini." },
    ],
  }),
});

const CAT_LABEL: Record<string, string> = {
  critique: "نقد التطور",
  evolution_basics: "أساسيات التطور",
  genetics: "علم الوراثة",
  creation_marvels: "إبداع الخالق",
};
const CAT_COLOR: Record<string, string> = {
  critique: "var(--c-critique)",
  evolution_basics: "var(--c-evolution)",
  genetics: "var(--c-genetics)",
  creation_marvels: "var(--c-creation)",
};

function Home() {
  const { isStaff } = useAuth();
  const [stats, setStats] = useState({ posts: 0, supervisors: 0, categories: 4 });
  const [latest, setLatest] = useState<any[]>([]);
  const TYPED_TEXT = "الدفاع عن الحقيقة في مواجهة الأوهام التطورية";
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      setTyped(TYPED_TEXT.slice(0, i));
      if (i < TYPED_TEXT.length) {
        timeout = setTimeout(tick, 70);
      } else {
        timeout = setTimeout(() => {
          i = 0;
          setTyped("");
          timeout = setTimeout(tick, 400);
        }, 2400);
      }
    };
    timeout = setTimeout(tick, 500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    (async () => {
      const [{ count: posts }, { count: supervisors }, { data: latestPosts }] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).in("role", ["owner", "moderator"]),
        supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({ posts: posts ?? 0, supervisors: supervisors ?? 0, categories: 4 });
      setLatest(latestPosts ?? []);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] glass-strong px-5 py-8 sm:px-8 sm:py-10 text-center space-y-5">
        <div className="absolute inset-0 pointer-events-none opacity-70" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--c-critic) 18%, transparent), transparent 35%, color-mix(in oklab, var(--c-genetics) 12%, transparent) 100%)" }} />
        <div className="relative space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[11px] font-bold tracking-wide text-primary">
            ◈ تحليل علمي ◈ نقد منهجي ◈ حقيقة موثقة ◈
          </p>
          <h1
            className="text-5xl sm:text-6xl font-black leading-tight"
            style={{
              color: "oklch(0.62 0.19 152)",
              textShadow: "0 0 22px oklch(0.62 0.19 152 / 0.55), 0 0 8px oklch(0.62 0.19 152 / 0.4)",
            }}
          >
            وهم التطور
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto min-h-[1.75rem]" aria-label={TYPED_TEXT}>
            <span>{typed}</span>
            <span className="inline-block w-[2px] h-[1em] align-[-0.15em] mx-1 bg-primary animate-pulse" />
          </p>
          <div className="mx-auto h-[2px] w-40 rounded-full" style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)", boxShadow: "0 0 18px var(--primary)" }} />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={stats.posts} label="منشورات" icon={BookOpen} color="var(--c-evolution)" />
        <StatCard value={stats.supervisors} label="مشرفون" icon={Users} color="var(--c-genetics)" />
        <StatCard value={stats.categories} label="أقسام" icon={Sparkles} color="var(--c-creation)" />
        <StatCard value="∞" label="نقاشات AI" icon={MessageCircle} color="var(--c-critic)" />
      </section>

      {/* Two main CTAs side by side */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/critic"
          className="glass rounded-3xl p-6 group hover:scale-[1.02] transition-all relative overflow-hidden glow-emerald"
          style={{ borderColor: "color-mix(in oklab, var(--c-critic) 40%, transparent)" }}
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none"
               style={{ background: "radial-gradient(ellipse at top, var(--c-critic), transparent 70%)" }} />
          <div className="relative space-y-3 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl glass-strong grid place-items-center text-2xl">
              🧠
            </div>
            <h3 className="text-xl font-bold" style={{ color: "var(--c-critic)" }}>
              ناقد التطور الذكي
            </h3>
            <p className="text-xs text-muted-foreground">
              مدعوم بأحدث Gemini · تحقق علمي مزدوج
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold pt-1" style={{ color: "var(--c-critic)" }}>
              ابدأ النقاش <ArrowLeft className="h-3 w-3" />
            </span>
          </div>
        </Link>

        <Link
          to={isStaff ? "/critique" : "/guest-post"}
          className="glass rounded-3xl p-6 group hover:scale-[1.02] transition-all relative overflow-hidden glow-warm"
          style={{ borderColor: "color-mix(in oklab, var(--c-guest) 40%, transparent)" }}
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none"
               style={{ background: "radial-gradient(ellipse at top, var(--c-guest), transparent 70%)" }} />
          <div className="relative space-y-3 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl glass-strong grid place-items-center text-2xl">
              ✍️
            </div>
            <h3 className="text-xl font-bold" style={{ color: "var(--c-guest)" }}>
              {isStaff ? "إضافة منشور" : "النشر كضيف"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isStaff ? "انطلق إلى الأقسام وأضف منشوراً مباشراً" : "شارك طرحك · يُعرض للمراجعة"}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold pt-1" style={{ color: "var(--c-guest)" }}>
              {isStaff ? "افتح قسم النشر" : "أرسل منشورك"} <ArrowLeft className="h-3 w-3" />
            </span>
          </div>
        </Link>
      </section>

      {/* Mission card with Basmala (matches reference video) */}
      <section className="glass-strong rounded-[2rem] p-6 sm:p-8 text-center space-y-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-60"
             style={{ background: "radial-gradient(ellipse at top, color-mix(in oklab, var(--primary) 18%, transparent), transparent 65%)" }} />
        <div className="relative space-y-4">
          <p
            className="text-xl sm:text-2xl font-bold"
            style={{
              fontFamily: '"Amiri Quran", "Amiri", "Tajawal", serif',
              color: "oklch(0.78 0.14 175)",
              textShadow: "0 0 18px oklch(0.78 0.14 175 / 0.45)",
            }}
          >
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </p>
          <h2 className="text-lg sm:text-2xl font-black leading-relaxed max-w-2xl mx-auto">
            الدفاع عن الحقيقة العلمية ونقد الأوهام التطورية بحدة وصرامة
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            منصة علمية تحليلية تتناول نظرية التطور بالنقد الموضوعي المستند إلى أحدث الأبحاث، مسلّحةً بأداة ذكاء اصطناعي متخصصة.
          </p>
        </div>
      </section>

      {/* Latest posts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gradient-emerald">
            📌 آخر المنشورات
          </h2>
          <AISearchButton />
        </div>
        {latest.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
            لا توجد منشورات بعد. كن أول من يكتب!
          </div>
        ) : (
          <div className="space-y-3">
            {latest.map((p) => (
              <article key={p.id} className="glass rounded-2xl p-5 hover:bg-white/5 transition">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: `color-mix(in oklab, ${CAT_COLOR[p.category]} 20%, transparent)`,
                      color: CAT_COLOR[p.category],
                      border: `1px solid color-mix(in oklab, ${CAT_COLOR[p.category]} 40%, transparent)`,
                    }}
                  >
                    {CAT_LABEL[p.category]}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1.5">{p.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {p.content.slice(0, 200)}...
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-[11px]">
                  <span className="text-muted-foreground">
                    {p.author_name ?? "—"} · {new Date(p.created_at).toLocaleDateString("ar")}
                  </span>
                  <Link to="/post/$id" params={{ id: p.id }} className="text-primary font-semibold hover:underline">
                    اقرأ المزيد ←
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ value, label, icon: Icon, color }: any) {
  return (
    <div className="glass rounded-2xl p-4 text-center" style={{ borderColor: `color-mix(in oklab, ${color} 30%, transparent)` }}>
      <Icon className="h-5 w-5 mx-auto mb-1.5" style={{ color }} />
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
