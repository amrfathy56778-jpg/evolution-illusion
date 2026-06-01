/** Detect current site language from Google Translate cookie or localStorage. */
export function getSiteLang(): string {
  if (typeof document === "undefined") return "ar";
  const m = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/);
  if (m?.[1]) return m[1];
  try { return localStorage.getItem("siteLang") || "ar"; } catch { return "ar"; }
}