const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extracts JSON object from any AI response text (strips code fences, etc.)
function extractJson(t: string): any {
  const s = t.replace(/```json/gi, "").replace(/```/g, "").trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no_json");
  return JSON.parse(m[0]);
}

// Compute a light-variant tokens object from dark tokens if AI omits it.
function invertOklch(v: string): string {
  const m = v.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/i);
  if (!m) return v;
  const L = parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const H = m[3];
  const A = m[4] ? ` / ${m[4]}` : "";
  const newL = L < 0.5 ? Math.min(0.98, 1 - L + 0.1) : Math.max(0.18, 1 - L - 0.05);
  const newC = Math.min(C, 0.14);
  return `oklch(${newL.toFixed(3)} ${newC.toFixed(3)} ${H}${A})`;
}
function deriveLight(dark: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(dark)) {
    if (k === "gradient") continue;
    out[k] = invertOklch(dark[k]);
  }
  out.gradient = `linear-gradient(165deg, ${out.background}, ${out.card})`;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { prompt } = await req.json();
    const p = String(prompt ?? "").trim().slice(0, 500);
    if (!p) return new Response(JSON.stringify({ error: "أدخل وصفاً للتصميم" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_KEY && !GROQ_KEY && !KEY) {
      return new Response(JSON.stringify({ error: "لا يوجد مفتاح ذكاء اصطناعي" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const schemaHint = [
      "أنت مصمم واجهات محترف. أعد فقط JSON صافياً بدون أي شرح.",
      "الشكل المطلوب بالضبط:",
      '{ "name": "اسم قصير بالعربية", "dark": { "background":"oklch(...)","foreground":"oklch(...)","card":"oklch(...)","primary":"oklch(...)","accent":"oklch(...)","muted":"oklch(...)","border":"oklch(1 0 0 / 18%)","gradient":"linear-gradient(165deg, oklch(...), oklch(...))" }, "light": { "background":"oklch(...)","foreground":"oklch(...)","card":"oklch(...)","primary":"oklch(...)","accent":"oklch(...)","muted":"oklch(...)","border":"oklch(0.2 0 0 / 16%)","gradient":"linear-gradient(165deg, oklch(...), oklch(...))" } }',
      "شروط: dark خلفيته L<0.25، light خلفيته L>0.9. النص foreground متباين قوي مع الخلفية. primary زاهي. استخدم oklch حصراً.",
      "الموقع: منصة نقد نظرية التطور، طبيعة/علم/خلق.",
    ].join("\n");

    const userMsg = `الوصف: ${p}`;

    let text = "";
    let lastErr = "";

    // 1) Lovable AI Gateway (primary)
    if (!text && KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: schemaHint }, { role: "user", content: userMsg }],
          }),
        });
        if (r.ok) { const j = await r.json(); text = (j?.choices?.[0]?.message?.content ?? "").trim(); }
        else lastErr = `gateway:${r.status}`;
      } catch (e) { lastErr = "gateway:" + (e as Error).message; }
    }

    // 2) Gemini direct
    if (!text && GEMINI_KEY) {
      try {
        const gr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: schemaHint }] },
            contents: [{ role: "user", parts: [{ text: userMsg }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        });
        if (gr.ok) {
          const gj = await gr.json();
          text = (gj?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).filter(Boolean).join("") ?? "").trim();
        } else lastErr = `gemini:${gr.status}`;
      } catch (e) { lastErr = "gemini:" + (e as Error).message; }
    }

    // 3) Groq fallback
    if (!text && GROQ_KEY) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: schemaHint }, { role: "user", content: userMsg }],
          }),
        });
        if (r.ok) { const j = await r.json(); text = (j?.choices?.[0]?.message?.content ?? "").trim(); }
        else lastErr = `groq:${r.status}`;
      } catch (e) { lastErr = "groq:" + (e as Error).message; }
    }

    if (!text) return new Response(JSON.stringify({ error: "تعذّر توليد التصميم (" + lastErr + ")" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });

    let theme: any;
    try { theme = extractJson(text); }
    catch { return new Response(JSON.stringify({ error: "استجابة الذكاء الاصطناعي غير صالحة" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } }); }

    // Backward compat: if AI returned old shape { name, tokens }, treat tokens as dark
    if (theme.tokens && !theme.dark) { theme.dark = theme.tokens; delete theme.tokens; }
    if (!theme.dark) return new Response(JSON.stringify({ error: "التصميم غير مكتمل" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    if (!theme.light) theme.light = deriveLight(theme.dark);
    if (!theme.name) theme.name = "تصميم مخصّص";

    return new Response(JSON.stringify(theme), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
