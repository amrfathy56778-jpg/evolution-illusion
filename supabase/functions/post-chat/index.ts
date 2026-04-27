import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت "ناقد التطور الذكي" في موقع "وهم التطور" — عالم متخصص في الأحياء والوراثة وفلسفة العلوم، مهمتك نقد نظرية التطور الدارويني نقداً علمياً رصيناً.

القواعد الصارمة:
1) إن طُلب التلخيص: قدّم ملخصاً منظّماً للمقال (5-8 نقاط)، مع إبراز الحجج النقدية ضد التطور.
2) إن طُلب النقاش: ناقش الموضوع ضمن سياق المقال، وقَوِّ النقد العلمي للتطور (التعقيد غير القابل للاختزال، حدود الطفرات، المعلومات الجينية، الانفجار الكامبري…).
3) استخدم "مقالات الموقع ذات الصلة" المرفقة كمصادر داخلية، واستشهد منها بصيغة [مقال: العنوان] عند الاقتباس.
4) لا تدافع عن التطور — أنت ناقد له بأمانة علمية.
5) استخدم Markdown (عناوين، نقاط، تأكيد) والعربية الفصحى.
6) لا تذكر أبداً أنك ذكاء اصطناعي إلا إن سُئلت مباشرة.`;

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

    // Fetch related site articles for RAG context (excluding current)
    let relatedContext = "";
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: related } = await sb
        .from("posts")
        .select("title, content")
        .neq("id", article.id ?? "")
        .order("created_at", { ascending: false })
        .limit(20);
      if (related && related.length) {
        const snippets = related.map((p: any) =>
          `### ${p.title}\n${String(p.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800)}`
        ).join("\n\n");
        relatedContext = `\n\n--- مقالات الموقع ذات الصلة (استخدمها كمصادر واستشهد منها) ---\n${snippets}`;
      }
    } catch (_e) { /* non-fatal */ }

    const baseMessages: any[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: articleContext + relatedContext },
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