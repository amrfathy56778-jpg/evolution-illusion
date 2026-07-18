// Site appearance: theme tokens (dark+light) + design style + visual-effects toggle.
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

export type ThemeVariant = { dark: ThemeTokens; light: ThemeTokens };
export type ThemePreset = { id: string; name: string } & ThemeVariant;

// Design "styles" — apply as `style-<id>` class on <html>. Styles affect
// surfaces (glass vs flat vs brutal), rounding, shadows, fonts. Colors are
// independent (from PRESETS/AI). Users can mix any style with any palette.
export type DesignStyle = { id: string; name: string; description: string; preset?: string };
// Six full site designs matching the reference mockups. Each design pairs a
// distinctive style class (fonts, surfaces, decorative accents, layout tweaks)
// with a matching color preset that is auto-applied when the design is picked.
export const STYLES: DesignStyle[] = [
  { id: "glass",     name: "افتراضي · زجاجي",       description: "تمويه ولمعان زجاجي أخضر",           preset: "default" },
  { id: "d1",        name: "تصميم 1 · مختبر داكن",   description: "شبكات علمية وإضاءة زمرّدية",         preset: "d1-scientific-dark" },
  { id: "d2",        name: "تصميم 2 · طبيعة فاتحة", description: "أوراق شجر ولمسات كلاسيكية",          preset: "d2-nature-light" },
  { id: "d3",        name: "تصميم 3 · مجرّة سماوية", description: "توهّج سماوي ونمط تقني",              preset: "d3-cyan-dark" },
  { id: "d4",        name: "تصميم 4 · بردية أثرية",  description: "بردي دافئ وخطوط عريقة",              preset: "d4-papyrus" },
  { id: "d5",        name: "تصميم 5 · نعناع مجلة",  description: "مجلة نعناعية أنيقة",                  preset: "d5-mint-light" },
  { id: "d6",        name: "تصميم 6 · نيون بنفسجي", description: "إضاءة نيون بنفسجية سايبر",           preset: "d6-violet-dark" },
];

const mkTokens = (
  dbg: string, dfg: string, dcard: string, dpri: string, dacc: string, dmut: string, dgrad: string,
  lbg: string, lfg: string, lcard: string, lpri: string, lacc: string, lmut: string, lgrad: string,
): ThemeVariant => ({
  dark:  { background: dbg, foreground: dfg, card: dcard, primary: dpri, accent: dacc, muted: dmut, border: "oklch(1 0 0 / 18%)", gradient: dgrad },
  light: { background: lbg, foreground: lfg, card: lcard, primary: lpri, accent: lacc, muted: lmut, border: "oklch(0.2 0.03 246 / 16%)", gradient: lgrad },
});

export const PRESETS: ThemePreset[] = [
  {
    id: "d1-scientific-dark", name: "تصميم 1 · نقد علمي داكن",
    ...mkTokens(
      "oklch(0.14 0.02 150)", "oklch(0.97 0.02 130)", "oklch(0.19 0.03 150)", "oklch(0.78 0.18 155)", "oklch(0.32 0.08 150)", "oklch(0.22 0.03 150)",
      "radial-gradient(ellipse 900px 650px at 15% 8%, oklch(0.42 0.16 155 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.14 0.02 150), oklch(0.1 0.02 160))",
      "oklch(0.98 0.005 150)", "oklch(0.18 0.03 150)", "oklch(0.96 0.01 150)", "oklch(0.5 0.16 155)", "oklch(0.9 0.05 150)", "oklch(0.93 0.01 150)",
      "radial-gradient(ellipse 900px 650px at 15% 8%, oklch(0.85 0.12 155 / 0.22), transparent 58%), linear-gradient(165deg, oklch(0.98 0.005 150), oklch(0.94 0.01 150))",
    ),
  },
  {
    id: "d2-nature-light", name: "تصميم 2 · طبيعة فاتحة",
    ...mkTokens(
      "oklch(0.2 0.04 145)", "oklch(0.97 0.02 130)", "oklch(0.26 0.05 145)", "oklch(0.62 0.18 145)", "oklch(0.34 0.09 140)", "oklch(0.26 0.04 145)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.5 0.16 140 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.2 0.04 145), oklch(0.16 0.04 155))",
      "oklch(0.98 0.02 130)", "oklch(0.2 0.05 145)", "oklch(0.99 0.01 130)", "oklch(0.5 0.18 145)", "oklch(0.88 0.08 130)", "oklch(0.94 0.02 130)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.88 0.12 140 / 0.35), transparent 58%), linear-gradient(165deg, oklch(0.99 0.01 130), oklch(0.95 0.03 145))",
    ),
  },
  {
    id: "d3-cyan-dark", name: "تصميم 3 · سماوي داكن",
    ...mkTokens(
      "oklch(0.14 0.04 220)", "oklch(0.98 0.01 220)", "oklch(0.19 0.05 220)", "oklch(0.78 0.16 200)", "oklch(0.32 0.08 210)", "oklch(0.22 0.04 220)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.45 0.16 200 / 0.32), transparent 58%), linear-gradient(165deg, oklch(0.14 0.04 220), oklch(0.1 0.04 210))",
      "oklch(0.97 0.01 220)", "oklch(0.18 0.05 220)", "oklch(0.96 0.015 220)", "oklch(0.5 0.16 200)", "oklch(0.88 0.06 210)", "oklch(0.93 0.02 220)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.82 0.12 200 / 0.24), transparent 58%), linear-gradient(165deg, oklch(0.97 0.01 220), oklch(0.94 0.02 210))",
    ),
  },
  {
    id: "d4-papyrus", name: "تصميم 4 · بردية كلاسيكية",
    ...mkTokens(
      "oklch(0.22 0.04 55)", "oklch(0.96 0.03 75)", "oklch(0.28 0.05 55)", "oklch(0.62 0.14 45)", "oklch(0.36 0.08 50)", "oklch(0.26 0.04 55)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.45 0.14 45 / 0.35), transparent 58%), linear-gradient(165deg, oklch(0.22 0.04 55), oklch(0.16 0.03 45))",
      "oklch(0.92 0.04 75)", "oklch(0.24 0.05 55)", "oklch(0.95 0.03 75)", "oklch(0.42 0.15 35)", "oklch(0.82 0.09 55)", "oklch(0.88 0.04 75)",
      "radial-gradient(ellipse 900px 650px at 10% 10%, oklch(0.8 0.11 55 / 0.45), transparent 58%), linear-gradient(165deg, oklch(0.93 0.04 75), oklch(0.88 0.05 60))",
    ),
  },
  {
    id: "d5-mint-light", name: "تصميم 5 · نعناعي فاتح",
    ...mkTokens(
      "oklch(0.15 0.03 180)", "oklch(0.97 0.01 180)", "oklch(0.2 0.04 180)", "oklch(0.62 0.15 175)", "oklch(0.32 0.08 180)", "oklch(0.22 0.03 180)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.45 0.14 175 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.15 0.03 180), oklch(0.11 0.03 175))",
      "oklch(0.99 0.005 180)", "oklch(0.2 0.03 180)", "oklch(1 0 0)", "oklch(0.52 0.15 175)", "oklch(0.9 0.05 180)", "oklch(0.95 0.01 180)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.9 0.09 175 / 0.25), transparent 58%), linear-gradient(165deg, oklch(0.99 0.005 180), oklch(0.96 0.01 180))",
    ),
  },
  {
    id: "d6-violet-dark", name: "تصميم 6 · بنفسجي داكن",
    ...mkTokens(
      "oklch(0.14 0.04 305)", "oklch(0.98 0.01 300)", "oklch(0.19 0.06 305)", "oklch(0.72 0.19 305)", "oklch(0.32 0.1 295)", "oklch(0.22 0.05 305)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.45 0.2 305 / 0.3), transparent 58%), linear-gradient(165deg, oklch(0.14 0.04 305), oklch(0.1 0.04 290))",
      "oklch(0.97 0.01 300)", "oklch(0.2 0.06 305)", "oklch(0.95 0.02 300)", "oklch(0.5 0.2 305)", "oklch(0.88 0.06 300)", "oklch(0.93 0.02 300)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.85 0.14 305 / 0.26), transparent 58%), linear-gradient(165deg, oklch(0.97 0.01 300), oklch(0.94 0.02 295))",
    ),
  },
  {
    id: "default", name: "زجاجي أخضر (افتراضي)",
    ...mkTokens(
      "oklch(0.14 0.03 246)", "oklch(0.98 0.01 255)", "oklch(0.2 0.04 248)", "oklch(0.8 0.16 185)", "oklch(0.3 0.06 215)", "oklch(0.24 0.03 248)",
      "radial-gradient(ellipse 900px 650px at 12% 8%, oklch(0.42 0.14 185 / 0.26), transparent 58%), linear-gradient(165deg, oklch(0.15 0.03 246), oklch(0.11 0.025 255))",
      "oklch(0.985 0.005 240)", "oklch(0.18 0.03 246)", "oklch(0.97 0.008 240)", "oklch(0.55 0.16 185)", "oklch(0.92 0.04 215)", "oklch(0.94 0.01 240)",
      "radial-gradient(ellipse 900px 650px at 12% 8%, oklch(0.78 0.12 185 / 0.18), transparent 58%), linear-gradient(165deg, oklch(0.985 0.005 240), oklch(0.96 0.01 220))",
    ),
  },
  {
    id: "forest", name: "غابة الخلق",
    ...mkTokens(
      "oklch(0.16 0.03 155)", "oklch(0.97 0.02 130)", "oklch(0.22 0.05 155)", "oklch(0.78 0.18 145)", "oklch(0.32 0.08 145)", "oklch(0.24 0.04 155)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.42 0.16 145 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.16 0.03 155), oklch(0.12 0.03 170))",
      "oklch(0.97 0.02 130)", "oklch(0.2 0.05 155)", "oklch(0.95 0.03 130)", "oklch(0.5 0.16 145)", "oklch(0.9 0.06 130)", "oklch(0.93 0.03 130)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.85 0.12 145 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.97 0.02 130), oklch(0.93 0.03 130))",
    ),
  },
  {
    id: "sand", name: "رمل الصحراء",
    ...mkTokens(
      "oklch(0.18 0.03 60)", "oklch(0.97 0.02 70)", "oklch(0.24 0.05 55)", "oklch(0.78 0.16 65)", "oklch(0.32 0.08 55)", "oklch(0.26 0.04 60)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.45 0.14 55 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.18 0.03 60), oklch(0.14 0.03 55))",
      "oklch(0.96 0.02 85)", "oklch(0.2 0.03 60)", "oklch(0.98 0.015 80)", "oklch(0.55 0.16 55)", "oklch(0.9 0.06 70)", "oklch(0.92 0.02 80)",
      "radial-gradient(ellipse 900px 650px at 12% 8%, oklch(0.85 0.11 65 / 0.35), transparent 58%), linear-gradient(165deg, oklch(0.97 0.02 85), oklch(0.93 0.03 65))",
    ),
  },
  {
    id: "cosmos", name: "أعماق الكون",
    ...mkTokens(
      "oklch(0.1 0.04 285)", "oklch(0.98 0.01 280)", "oklch(0.18 0.06 285)", "oklch(0.78 0.19 300)", "oklch(0.32 0.1 260)", "oklch(0.22 0.05 285)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.45 0.2 300 / 0.32), transparent 58%), linear-gradient(165deg, oklch(0.1 0.04 285), oklch(0.08 0.04 260))",
      "oklch(0.97 0.01 280)", "oklch(0.18 0.06 285)", "oklch(0.95 0.015 280)", "oklch(0.5 0.19 300)", "oklch(0.88 0.06 280)", "oklch(0.93 0.02 280)",
      "radial-gradient(ellipse 900px 650px at 15% 10%, oklch(0.82 0.14 300 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.97 0.01 280), oklch(0.93 0.02 260))",
    ),
  },
  {
    id: "ocean", name: "المحيط العميق",
    ...mkTokens(
      "oklch(0.14 0.05 235)", "oklch(0.98 0.01 220)", "oklch(0.2 0.06 235)", "oklch(0.78 0.16 220)", "oklch(0.32 0.08 215)", "oklch(0.24 0.05 235)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.4 0.16 220 / 0.32), transparent 58%), linear-gradient(165deg, oklch(0.14 0.05 235), oklch(0.1 0.05 220))",
      "oklch(0.97 0.015 220)", "oklch(0.18 0.05 235)", "oklch(0.95 0.02 220)", "oklch(0.5 0.16 220)", "oklch(0.88 0.06 215)", "oklch(0.93 0.02 220)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.82 0.12 220 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.97 0.015 220), oklch(0.93 0.025 210))",
    ),
  },
  {
    id: "papyrus", name: "بردية قديمة",
    ...mkTokens(
      "oklch(0.2 0.03 45)", "oklch(0.97 0.02 75)", "oklch(0.26 0.04 45)", "oklch(0.7 0.15 45)", "oklch(0.34 0.07 40)", "oklch(0.24 0.03 45)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.45 0.14 40 / 0.3), transparent 58%), linear-gradient(165deg, oklch(0.2 0.03 45), oklch(0.16 0.03 40))",
      "oklch(0.93 0.03 75)", "oklch(0.22 0.04 45)", "oklch(0.96 0.02 75)", "oklch(0.45 0.15 35)", "oklch(0.85 0.08 55)", "oklch(0.9 0.03 75)",
      "radial-gradient(ellipse 900px 650px at 10% 10%, oklch(0.82 0.1 55 / 0.4), transparent 58%), linear-gradient(165deg, oklch(0.94 0.03 75), oklch(0.9 0.04 65))",
    ),
  },
  {
    id: "crimson", name: "قرمزي أنيق",
    ...mkTokens(
      "oklch(0.14 0.03 15)", "oklch(0.98 0.01 20)", "oklch(0.2 0.05 15)", "oklch(0.7 0.2 25)", "oklch(0.32 0.08 15)", "oklch(0.24 0.04 15)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.42 0.18 25 / 0.28), transparent 58%), linear-gradient(165deg, oklch(0.14 0.03 15), oklch(0.1 0.03 10))",
      "oklch(0.98 0.005 20)", "oklch(0.18 0.03 15)", "oklch(0.96 0.01 20)", "oklch(0.5 0.2 25)", "oklch(0.9 0.05 15)", "oklch(0.94 0.01 20)",
      "radial-gradient(ellipse 900px 650px at 20% 10%, oklch(0.85 0.12 25 / 0.22), transparent 58%), linear-gradient(165deg, oklch(0.98 0.005 20), oklch(0.94 0.01 15))",
    ),
  },
];

const CUSTOM_KEY = "site.customTheme.v2"; // stores { dark, light }
const THEME_KEY = "site.themeId";
const STYLE_KEY = "site.styleId";
const FX_KEY = "site.fxOff";
const DEFAULT_STYLE = "glass";

function isLight(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("light");
}

export function applyVariant(v: ThemeVariant) {
  const tokens = isLight() ? v.light : v.dark;
  const r = document.documentElement.style;
  const set = (k: string, val?: string) => { if (val) r.setProperty(k, val); };
  set("--background", tokens.background);
  set("--foreground", tokens.foreground);
  set("--card", tokens.card);
  set("--card-foreground", tokens.foreground);
  set("--popover", tokens.card);
  set("--popover-foreground", tokens.foreground);
  set("--primary", tokens.primary);
  set("--accent", tokens.accent);
  set("--accent-foreground", tokens.foreground);
  set("--muted", tokens.muted);
  set("--muted-foreground", tokens.foreground);
  set("--secondary", tokens.muted);
  set("--secondary-foreground", tokens.foreground);
  set("--border", tokens.border);
  set("--input", tokens.border);
  set("--ring", tokens.primary);
  set("--gradient-bg", tokens.gradient);
}

export function resetTokens() {
  const r = document.documentElement.style;
  ["--background","--foreground","--card","--card-foreground","--popover","--popover-foreground",
   "--primary","--accent","--accent-foreground","--muted","--muted-foreground",
   "--secondary","--secondary-foreground","--border","--input","--ring","--gradient-bg"]
    .forEach(p => r.removeProperty(p));
}

export function applyFx(off: boolean) {
  document.documentElement.classList.toggle("fx-off", off);
}

function applyStyleClass(styleId: string) {
  const el = document.documentElement;
  STYLES.forEach(s => el.classList.remove(`style-${s.id}`));
  if (styleId && styleId !== DEFAULT_STYLE) el.classList.add(`style-${styleId}`);
  // Always add default style class too so CSS can hook if needed.
  el.classList.add(`style-${styleId || DEFAULT_STYLE}`);
}

// Re-apply current theme tokens whenever html.light toggles (dark/light swap).
let mo: MutationObserver | null = null;
function watchMode() {
  if (mo || typeof document === "undefined") return;
  mo = new MutationObserver(() => reapplyCurrent());
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}
function reapplyCurrent() {
  const id = getThemeId();
  if (!id || id === "default") { resetTokens(); return; }
  if (id === "custom") {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) { try { applyVariant(JSON.parse(raw)); } catch {} }
    return;
  }
  const preset = PRESETS.find(p => p.id === id);
  if (preset) applyVariant(preset);
}

export function loadAppearance() {
  if (typeof window === "undefined") return;
  try {
    applyFx(localStorage.getItem(FX_KEY) === "1");
    applyStyleClass(localStorage.getItem(STYLE_KEY) || DEFAULT_STYLE);
    reapplyCurrent();
    watchMode();
  } catch { /* ignore */ }
}

export function setThemePreset(id: string) {
  localStorage.setItem(THEME_KEY, id);
  if (id === "default") { resetTokens(); return; }
  const preset = PRESETS.find(p => p.id === id);
  if (preset) applyVariant(preset);
}

export function setCustomTheme(variant: ThemeVariant) {
  localStorage.setItem(THEME_KEY, "custom");
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(variant));
  applyVariant(variant);
}

export function setDesignStyle(styleId: string) {
  localStorage.setItem(STYLE_KEY, styleId);
  applyStyleClass(styleId);
}
export function getDesignStyle(): string {
  if (typeof window === "undefined") return DEFAULT_STYLE;
  return localStorage.getItem(STYLE_KEY) || DEFAULT_STYLE;
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

// Backward compatibility for legacy calls
export function applyTokens(tokens: ThemeTokens) {
  // Treat legacy single-tokens object as dark; derive minimal light fallback.
  applyVariant({ dark: tokens, light: tokens });
}
