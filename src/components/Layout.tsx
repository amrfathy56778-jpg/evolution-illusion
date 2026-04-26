import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, Home, Sparkles, Dna, Leaf, Microscope, Shield, Sun, Moon, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

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
  const path = location.pathname;
  // Show categories nav only on home, section pages and posting pages.
  const showNav = path === "/" || ["/critique", "/evolution", "/genetics", "/creation", "/guest-post"].some(p => path === p || path.startsWith(p + "/"));

  const [theme, setTheme] = useState<"dark" | "light">(() => (typeof window !== "undefined" && localStorage.getItem("theme") === "light") ? "light" : "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="ambient-orbs relative min-h-screen">
      <header className="sticky top-0 z-30 glass-strong border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logo} alt="وهم التطور" className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(250,200,80,0.45)]" />
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "وضع نهاري" : "وضع ليلي"}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full glass hover:bg-white/10 transition">
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <TranslateButton />
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

        {showNav && (
        <nav className="mx-auto max-w-6xl px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-thin">
          {NAV.map((item) => {
            const active = path === item.to;
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
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-3 sm:px-4 py-6">
        <Outlet />
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
        وهم التطور · منصة علمية للنقد المنهجي · {new Date().getFullYear()}
      </footer>
      <div id="google_translate_element" className="fixed bottom-3 left-3 z-40 opacity-0 pointer-events-none"/>
    </div>
  );
}

// Google Translate widget — loads on demand, then opens the language picker
function TranslateButton() {
  const [ready, setReady] = useState(false);
  const ensureLoaded = () => {
    if ((window as any).google?.translate?.TranslateElement) { setReady(true); return Promise.resolve(); }
    return new Promise<void>((resolve) => {
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: "ar", layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE },
          "google_translate_element"
        );
        setReady(true);
        resolve();
      };
      const s = document.createElement("script");
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    });
  };
  const open = async () => {
    await ensureLoaded();
    // Open native dropdown
    setTimeout(() => {
      const sel = document.querySelector<HTMLSelectElement>("#google_translate_element select");
      if (sel) { sel.focus(); sel.click(); sel.dispatchEvent(new MouseEvent("mousedown")); }
      const el = document.getElementById("google_translate_element");
      if (el) { el.style.opacity = "1"; el.style.pointerEvents = "auto"; }
    }, 100);
  };
  return (
    <button onClick={open} title="ترجمة الموقع"
      className="inline-flex items-center justify-center h-8 w-8 rounded-full glass hover:bg-white/10 transition">
      <Globe className="h-3.5 w-3.5" />
    </button>
  );
}