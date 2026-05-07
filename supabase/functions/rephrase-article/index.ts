// Rephrase an HTML article using Gemini, preserving images, videos, links, and structure.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت محرر لغوي خبير. مهمتك: إعادة صياغة المقال HTML المُعطى بأسلوب أوضح وأبلغ مع:
- الحفاظ التام على بنية HTML (الوسوم h1-h6, p, ul, ol, li, blockquote, strong, em, a, img, video, iframe, br, hr).
- لا تحذف ولا تضف صوراً أو فيديوهات أو روابط؛ احتفظ بكل وسم <img>, <video>, <iframe>, و<a href> كما هي تماماً (نفس src/href والخصائص) ولكن أعد ترتيبها داخل الفقرات لتتناسب مع السياق المُعاد صياغته.
- لا تضِف أي شرح خارج المقال. لا تكتب "إليك الصياغة:" ولا أي مقدمة. أعد فقط HTML المقال الجديد.
- الحفاظ على المعنى الأصلي والحقائق دون اختراع.
- استخدم نفس لغة المقال.
- أعد فقط HTML — لا Markdown ولا code fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { html, lang } = await req.json();
    if (!html || typeof html !== "string") {
      return new Response(JSON.stringify({ error: "html required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    const LANG_NAMES: Record<string, string> = { ar:"Arabic", en:"English", fr:"French", es:"Spanish", de:"German", it:"Italian", tr:"Turkish", ru:"Russian", zh:"Chinese", ja:"Japanese", ko:"Korean", pt:"Portuguese" };
    const langName = LANG_NAMES[String(lang||"ar").toLowerCase()] || "Arabic";
    const sys = SYSTEM + `\n\nاكتب الصياغة الجديدة بـ${langName}.`;
    const userMsg = `أعد صياغة المقال التالي مع الإبقاء على كل وسوم HTML والروابط والصور والفيديوهات في مواضع مناسبة:\n\n${html}`;

    if (GEMINI_KEY) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: "user", parts: [{ text: userMsg }] }],
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const text = j?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).filter(Boolean).join("") ?? "";
        const cleaned = text.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();
        return new Response(JSON.stringify({ html: cleaned }), { headers: { ...cors, "Content-Type": "application/json" } });
      }
    }
    if (LOVABLE_KEY) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: t }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const j = await r.json();
      const text = j?.choices?.[0]?.message?.content ?? "";
      const cleaned = text.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();
      return new Response(JSON.stringify({ html: cleaned }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "No AI key configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});