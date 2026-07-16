// Site appearance: theme tokens + visual-effects toggle.
export type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  accent: string;
  muted: string;
  border?: string;
  gradient?: string;
};

export type ThemePreset = { id: string; name: string; tokens: ThemeTokens };

export const PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "الافتراضي (زجاجي أخضر)",
    tokens: {
      background: "oklch(0.14 0.03 246)",
      foreground: "oklch(0.98 0.01 255)",
      card: "oklch(0.2 0.04 248)",
      primary: "oklch(0.8 0.16 185)",
      accent: "oklch(0.3 0.06 215)",
      muted: "oklch(0.24 0.03 248)",
      border: "oklch(1 0 0 / 18%)",
      gradient:
        "radial-gradient(ellipse 900px 650px at 12% 8%, oklch(0.42 0.14 185 / 0.26), transparent 58%), radial-gradient(ellipse 760px 580px at 84% 18%, oklch(0.44 0.11 220 / 0.2), transparent 56%), radial-gradient(ellipse 720px 560px at 70% 92%, oklch(0.42 0.14 285 / 0.2), transparent 58%), linear-gradient(165deg, oklch(0.15 0.03 246), oklch(0.11 0.025 255))",
    },
  },
  {
    id: "forest",
    name: "غابة الخلق",
    tokens: {
      background: "oklch(0.16 0.03 155)",
      foreground: "oklch(0.97 0.02 130)",
      card: "oklch(0.22 0.05 155)",
      primary: "oklch(0.78 0.18 145)",
      accent: "oklch(0.32 0.08 145)",
      muted: "oklch(0.24 0.04 155)",
      border: "oklch(1 0 0 / 16%)",
      gradient:
        "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.42 0.16 145 / 0.28), transparent 58%), radial-gradient(ellipse 760px 580px at 85% 90%, oklch(0.4 0.14 100 / 0.22), transparent 56%), linear-gradient(165deg, oklch(0.16 0.03 155), oklch(0.12 0.03 170))",
    },
  },
  {
    id: "sand",
    name: "رمل الصحراء",
    tokens: {
      background: "oklch(0.96 0.02 85)",
      foreground: "oklch(0.2 0.03 60)",
      card: "oklch(0.98 0.015 80)",
      primary: "oklch(0.55 0.16 55)",
      accent: "oklch(0.9 0.06 70)",
      muted: "oklch(0.92 0.02 80)",
      border: "oklch(0.2 0.03 60 / 16%)",
      gradient:
        "radial-gradient(ellipse 900px 650px at 12% 8%, oklch(0.85 0.11 65 / 0.35), transparent 58%), radial-gradient(ellipse 760px 580px at 84% 18%, oklch(0.85 0.08 40 / 0.28), transparent 56%), linear-gradient(165deg, oklch(0.97 0.02 85), oklch(0.93 0.03 65))",
    },
  },
  {
    id: "cosmos",
    name: "أعماق الكون",
    tokens: {
      background: "oklch(0.1 0.04 285)",
      foreground: "oklch(0.98 0.01 280)",
      card: "oklch(0.18 0.06 285)",
      primary: "oklch(0.78 0.19 300)",
      accent: "oklch(0.32 0.1 260)",
      muted: "oklch(0.22 0.05 285)",
      border: "oklch(1 0 0 / 18%)",
      gradient:
        "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.45 0.2 300 / 0.32), transparent 58%), radial-gradient(ellipse 760px 580px at 85% 90%, oklch(0.4 0.2 260 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.1 0.04 285), oklch(0.08 0.04 260))",
    },
  },
  {
    id: "ocean",
    name: "المحيط العميق",
    tokens: {
      background: "oklch(0.14 0.05 235)",
      foreground: "oklch(0.98 0.01 220)",
      card: "oklch(0.2 0.06 235)",
      primary: "oklch(0.78 0.16 220)",
      accent: "oklch(0.32 0.08 215)",
      muted: "oklch(0.24 0.05 235)",
      border: "oklch(1 0 0 / 16%)",
      gradient:
        "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.4 0.16 220 / 0.32), transparent 58%), radial-gradient(ellipse 760px 580px at 80% 90%, oklch(0.4 0.14 195 / 0.24), transparent 58%), linear-gradient(165deg, oklch(0.14 0.05 235), oklch(0.1 0.05 220))",
    },
  },
  {
    id: "papyrus",
    name: "بردية قديمة",
    tokens: {
      background: "oklch(0.93 0.03 75)",
      foreground: "oklch(0.22 0.04 45)",
      card: "oklch(0.96 0.02 75)",
      primary: "oklch(0.45 0.15 35)",
      accent: "oklch(0.85 0.08 55)",
      muted: "oklch(0.9 0.03 75)",
      border: "oklch(0.22 0.04 45 / 18%)",
      gradient:
        "radial-gradient(ellipse 900px 650px at 10% 10%, oklch(0.82 0.1 55 / 0.4), transparent 58%), radial-gradient(ellipse 760px 580px at 90% 90%, oklch(0.75 0.13 35 / 0.28), transparent 56%), linear-gradient(165deg, oklch(0.94 0.03 75), oklch(0.9 0.04 65))",
    },
  },
];

const CUSTOM_KEY = "site.customTheme";
const THEME_KEY = "site.themeId";
const FX_KEY = "site.fxOff";

export function applyTokens(tokens: ThemeTokens) {
  const r = document.documentElement.style;
  r.setProperty("--background", tokens.background);
  r.setProperty("--foreground", tokens.foreground);
  r.setProperty("--card", tokens.card);
  r.setProperty("--card-foreground", tokens.foreground);
  r.setProperty("--popover", tokens.card);
  r.setProperty("--popover-foreground", tokens.foreground);
  r.setProperty("--primary", tokens.primary);
  r.setProperty("--accent", tokens.accent);
  r.setProperty("--muted", tokens.muted);
  r.setProperty("--muted-foreground", tokens.foreground);
  r.setProperty("--secondary", tokens.muted);
  r.setProperty("--secondary-foreground", tokens.foreground);
  if (tokens.border) r.setProperty("--border", tokens.border);
  if (tokens.gradient) r.setProperty("--gradient-bg", tokens.gradient);
}

export function resetTokens() {
  const r = document.documentElement.style;
  ["--background","--foreground","--card","--card-foreground","--popover","--popover-foreground","--primary","--accent","--muted","--muted-foreground","--secondary","--secondary-foreground","--border","--gradient-bg"].forEach(p => r.removeProperty(p));
}

export function applyFx(off: boolean) {
  document.documentElement.classList.toggle("fx-off", off);
}

export function loadAppearance() {
  if (typeof window === "undefined") return;
  try {
    const fx = localStorage.getItem(FX_KEY) === "1";
    applyFx(fx);
    const id = localStorage.getItem(THEME_KEY);
    if (!id || id === "default") { resetTokens(); return; }
    if (id === "custom") {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) applyTokens(JSON.parse(raw));
      return;
    }
    const preset = PRESETS.find(p => p.id === id);
    if (preset) applyTokens(preset.tokens);
  } catch { /* ignore */ }
}

export function setThemePreset(id: string) {
  localStorage.setItem(THEME_KEY, id);
  if (id === "default") { resetTokens(); return; }
  const preset = PRESETS.find(p => p.id === id);
  if (preset) applyTokens(preset.tokens);
}

export function setCustomTheme(tokens: ThemeTokens) {
  localStorage.setItem(THEME_KEY, "custom");
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(tokens));
  applyTokens(tokens);
}

export function getFxOff(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FX_KEY) === "1";
}
export function setFxOff(off: boolean) {
  localStorage.setItem(FX_KEY, off ? "1" : "0");
  applyFx(off);
}
export function getThemeId(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(THEME_KEY) ?? "default";
}