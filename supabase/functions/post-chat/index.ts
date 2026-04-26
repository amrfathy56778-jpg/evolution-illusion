import "https://deno.land/x/xhr@0.1.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت مساعد علمي يتحدث العربية بطلاقة. مهمتك:
1) إن طُلب منك التلخيص: قدّم ملخصاً مركّزاً ومنظّماً للمقال (5-8 نقاط واضحة) مع الحفاظ على المصطلحات العلمية.
2) إن طُلب منك النقاش: ناقش الموضوع باستفاضة ضمن سياق المقال فقط، ولا تخرج عن موضوعه.
3) كن دقيقاً، موضوعياً، وغير منحاز للتطور — هذا موقع نقدي للتطور.
4) استخدم تنسيق Markdown بسيط (عناوين قصيرة، نقاط، تأكيد).
لا تذكر أبداً أنك ذكاء اصطناعي إلا إن سُئلت مباشرة.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { article, mode, messages } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!article?.title || !article?.content) {
      return new Response(JSON.stringify({ error: "article required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const plain = String(article.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
    const articleContext = `عنوان المقال: ${article.title}\n\nنص المقال:\n${plain}`;

    const baseMessages: any[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: articleContext },
    ];

    if (mode === "summarize") {
      baseMessages.push({ role: "user", content: "لخّص المقال السابق في نقاط واضحة." });
    } else if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          baseMessages.push({ role: m.role, content: m.content.slice(0, 4000) });
        }
      }
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: baseMessages,
        stream: true,
      }),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول بعد قليل." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "نفد الرصيد، يرجى إضافة رصيد." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      const t = await r.text();
      return new Response(JSON.stringify({ error: t }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(r.body, { headers: { ...cors, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});