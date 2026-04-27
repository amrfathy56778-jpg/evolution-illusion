import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, Home, Sparkles, Dna, Leaf, Microscope, Shield, Sun, Moon, Globe, Check, X } from "lucide-react";
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
  // Reading-focused pages should maximize horizontal space
  const isReadingFocus = path.startsWith("/post/") || path === "/critic";

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

      <main className={`relative z-10 mx-auto px-2 sm:px-4 py-4 ${isReadingFocus ? "max-w-5xl" : "max-w-6xl"}`}>
        <Outlet />
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
        وهم التطور · منصة علمية للنقد المنهجي · {new Date().getFullYear()}
      </footer>
      {/* Hidden anchor required by Google Translate script */}
      <div id="google_translate_element" className="sr-only" aria-hidden="true"/>
    </div>
  );
}

// Custom Google Translate launcher — neat vertical scrollable language list
const LANGS: { code: string; label: string; native: string }[] = [
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "fa", label: "Persian", native: "فارسی" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "zh-CN", label: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "sv", label: "Swedish", native: "Svenska" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "uk", label: "Ukrainian", native: "Українська" },
  { code: "el", label: "Greek", native: "Ελληνικά" },
  { code: "he", label: "Hebrew", native: "עברית" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
];

function getCurrentLang(): string {
  if (typeof document === "undefined") return "ar";
  const m = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/);
  return m?.[1] ?? "ar";
}

function setLang(code: string) {
  // Ensure Google Translate script is loaded once
  if (!(window as any).googleTranslateElementInit) {
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: "ar", autoDisplay: false },
        "google_translate_element"
      );
    };
    const s = document.createElement("script");
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }
  // Set cookie on the current host AND the parent domain (Google reads either)
  const value = `/ar/${code}`;
  const host = window.location.hostname;
  const parts = host.split(".");
  const root = parts.length > 1 ? "." + parts.slice(-2).join(".") : host;
  document.cookie = `googtrans=${value}; path=/`;
  document.cookie = `googtrans=${value}; path=/; domain=${root}`;
  // Reload so Google Translate applies the new target language
  window.location.reload();
}

function TranslateButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("ar");
  useEffect(() => { setCurrent(getCurrentLang()); }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} title="ترجمة الموقع"
        className="inline-flex items-center justify-center h-8 w-8 rounded-full glass hover:bg-white/10 transition">
        <Globe className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
             onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-xs glass-strong rounded-3xl p-3 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between px-2 py-2 border-b border-white/10 mb-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Globe className="h-3.5 w-3.5"/> اختر لغة الترجمة
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-white/10">
                <X className="h-3.5 w-3.5"/>
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto flex flex-col gap-0.5 scrollbar-thin">
              {LANGS.map(l => (
                <li key={l.code}>
                  <button onClick={() => setLang(l.code)}
                    className={`w-full flex items-center justify-between gap-2 text-right px-3 py-2.5 rounded-xl text-sm transition ${
                      l.code === current ? "bg-primary/20 text-primary font-bold" : "hover:bg-white/10"}`}>
                    <span className="flex flex-col items-start">
                      <span>{l.native}</span>
                      <span className="text-[10px] text-muted-foreground">{l.label}</span>
                    </span>
                    {l.code === current && <Check className="h-3.5 w-3.5"/>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}