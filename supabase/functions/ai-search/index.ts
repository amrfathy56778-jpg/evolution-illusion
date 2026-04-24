// Edge function: بحث ذكي في المقالات باستخدام Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت مساعد بحث ذكي في موقع "وهم التطور". ستحصل على قائمة منشورات الموقع (id, title, category, snippet) مع سؤال المستخدم.
مهمتك:
1. حدّد المنشورات الأكثر صلة بالسؤال (حتى 5 نتائج).
2. اكتب إجابة موجزة بالعربية الفصحى تلخّص ما يجده المستخدم في تلك المنشورات.
3. أعد JSON فقط بهذا الشكل:
{"answer":"...","results":[{"id":"...","title":"...","reason":"..."}]}
لا تضف أي نص خارج JSON.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, posts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!query || typeof query !== "string") throw new Error("query required");

    const corpus = (posts ?? []).slice(0, 80).map((p: any) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      snippet: String(p.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 400),
    }));

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `السؤال: ${query}\n\nالمنشورات:\n${JSON.stringify(corpus)}` },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: t }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { answer: content, results: [] }; }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});