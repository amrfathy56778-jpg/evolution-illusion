import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, Home, Sparkles, Dna, Leaf, Microscope, Shield, MessageSquare, PenLine } from "lucide-react";

const NAV = [
  { to: "/", label: "الرئيسية", icon: Home, color: "var(--c-home)" },
  { to: "/critic", label: "ناقد التطور الذكي", icon: Sparkles, color: "var(--c-critic)" },
  { to: "/critique", label: "نقد التطور", icon: Microscope, color: "var(--c-critique)" },
  { to: "/evolution", label: "أساسيات التطور", icon: Leaf, color: "var(--c-evolution)" },
  { to: "/genetics", label: "علم الوراثة", icon: Dna, color: "var(--c-genetics)" },
  { to: "/creation", label: "إبداع الخالق", icon: Sparkles, color: "var(--c-creation)" },
] as const;

export default function Layout() {
  const { user, isStaff, isOwner, signOut } = useAuth();
  const { location } = useRouterState();

  return (
    <div className="ambient-orbs relative min-h-screen">
      <header className="sticky top-0 z-30 glass-strong border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl glass glow-emerald grid place-items-center text-lg">🧬</div>
            <span className="font-bold text-lg text-gradient-emerald">وهم التطور</span>
          </Link>

          <div className="flex items-center gap-2">
            {isStaff && (
              <Link to="/admin" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold hover:bg-white/10 transition">
                <Shield className="h-3.5 w-3.5" />
                {isOwner ? "لوحة المالك" : "لوحة المشرف"}
              </Link>
            )}
            {user ? (
              <button onClick={signOut} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold hover:bg-white/10 transition">
                <LogOut className="h-3.5 w-3.5" /> خروج
              </button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition glow-emerald">
                <LogIn className="h-3.5 w-3.5" /> دخول
              </Link>
            )}
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-thin">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold glass transition hover:scale-105"
                style={
                  active
                    ? { background: `color-mix(in oklab, ${item.color} 35%, transparent)`, borderColor: item.color, boxShadow: `0 0 20px -5px ${item.color}` }
                    : { color: item.color }
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
        وهم التطور · منصة علمية للنقد المنهجي · {new Date().getFullYear()}
      </footer>
    </div>
  );
}