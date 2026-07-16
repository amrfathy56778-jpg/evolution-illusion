const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns a JSON theme = { name, tokens: { background, foreground, card, primary, accent, muted, gradient } }
// where each entry is a raw CSS value (oklch/hex or a linear-gradient string).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { prompt } = await req.json();
    const p = String(prompt ?? "").trim().slice(0, 500);
    if (!p) return new Response(JSON.stringify({ error: "أدخل وصفاً للتصميم" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_KEY && !GROQ_KEY && !KEY) throw new Error("لا يوجد مفتاح ذكاء اصطناعي");

    const sys = `أنت مصمم واجهات. أعد فقط JSON صافياً (بدون أي شرح ولا سياج ```) بهذا الشكل بالضبط:
{
  "name": "اسم قصير للتصميم بالعربية (2-4 كلمات)",
  "tokens": {
    "background": "oklch(...)",
    "foreground": "oklch(...)",
    "card": "oklch(...)",
    "primary": "oklch(...)",
    "accent": "oklch(...)",
    "muted": "oklch(...)",
    "border": "oklch(1 0 0 / 18%)",
    "gradient": "linear-gradient(165deg, oklch(...), oklch(...))"
  }
}
الموقع اسمه "وهم التطور" وهو ناقد لنظرية التطور، متعلق بالخلق والطبيعة والعلم. اجعل الألوان متناغمة، تباين ممتاز بين النص والخلفية، وأنيقة. استخدم صيغة oklch حصراً في كل الحقول عدا gradient.`;

    const userMsg = `الوصف المطلوب: ${p}`;

    const extractJson = (t: string): any => {
      const s = t.replace(/```json|```/gi, "").trim();
      const m = s.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("لم يُرجع الذكاء الاصطناعي JSON صالحاً");
      return JSON.parse(m[0]);
    };

    let text = "";
    if (GEMINI_KEY) {
      const gr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: "user", parts: [{ text: userMsg }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (gr.ok) {
        const gj = await gr.json();
        text = (gj?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).filter(Boolean).join("") ?? "").trim();
      }
    }
    if (!text && GROQ_KEY) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", response_format: { type: "json_object" },
          messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }] }),
      });
      if (r.ok) { const j = await r.json(); text = (j?.choices?.[0]?.message?.content ?? "").trim(); }
    }
    if (!text && KEY) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }] }),
      });
      if (r.ok) { const j = await r.json(); text = (j?.choices?.[0]?.message?.content ?? "").trim(); }
    }
    if (!text) return new Response(JSON.stringify({ error: "تعذّر توليد التصميم" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

    const theme = extractJson(text);
    return new Response(JSON.stringify(theme), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});