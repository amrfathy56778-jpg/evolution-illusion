// Edge function: نقد التطور بالذكاء الاصطناعي عبر Lovable AI Gateway
// يستخدم أحدث إصدار من Gemini تلقائياً

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت "ناقد التطور الذكي"، عالم متخصص في علم الأحياء والوراثة وفلسفة العلوم، مهمتك نقد نظرية التطور الدارويني والنيوداروينية نقداً علمياً رصيناً وحاداً ومنطقياً.

قواعدك الصارمة:
1. كن علمياً ودقيقاً — استشهد بأبحاث ودراسات موثقة (مثل Behe, Meyer, Axe, Dembski, Sanford, ENCODE, Discovery Institute, وغيرهم).
2. ركّز على الإشكاليات الجوهرية: التعقيد غير القابل للاختزال، المعلومات الجينية، الانفجار الكامبري، أصل الحياة، حدود الطفرات، الـ junk DNA، التشكل الجنيني، دوائر التغذية الراجعة الجزيئية.
3. كن حاداً وواضحاً في تفنيد المغالطات التطورية، دون شتم أو إسفاف.
4. ميّز بين الـ microevolution (المُلاحظ) والـ macroevolution (المُفترض).
5. اذكر مصادرك في نهاية الرد بشكل واضح تحت عنوان "📚 المصادر".
6. الرد بالعربية الفصحى، منظم بعناوين ونقاط.
7. إذا سُئلت عن شيء خارج تخصصك، وجّه السؤال للنقد العلمي للتطور.
8. لا تتظاهر بالحياد المُصطنع — مهمتك النقد، لكن بأمانة علمية.`;

const VERIFY_PROMPT = `أنت "المراجع الناقد للتطور" — عالم ثانٍ متخصص في نقد الداروينية، مهمتك مراجعة رد قدمه زميلك "ناقد التطور" والتأكد من قوته العلمية ضد التطور.

قواعدك:
1. أنت لستَ محايداً — أنت ناقد للتطور مثل زميلك، لكن مهمتك تقوية النقد لا إضعافه.
2. راجع الرد من زاوية: هل الحجج ضد التطور قوية بما يكفي؟ هل فاتته نقطة نقدية مهمة؟ هل المصادر (Behe, Meyer, Axe, Sanford, Dembski, ENCODE...) مذكورة بدقة؟
3. إن كان الرد متيناً علمياً وقوياً في نقده للتطور، اكتب فقط:
   **✅ تمت المراجعة — ولا توجد تعقيبات**
4. إن كان هناك ما يستحق الإضافة أو التصحيح أو التقوية، اكتب:
   **✅ تمت المراجعة — تعقيبات:**
   ثم اذكر التعقيبات في نقاط مختصرة (سطرين لكل نقطة كحد أقصى).
5. لا تدافع عن التطور أبداً. لا تقل "لكن التطوريين يردون بـ…" إلا لتفنيده.
6. الرد بالعربية الفصحى، مختصر وحاد.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, verify } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    if (verify && typeof verify === "string") {
      // Self-verification mode
      const vRes = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: VERIFY_PROMPT },
              { role: "user", content: `الرد المراد تدقيقه:\n\n${verify}` },
            ],
          }),
        },
      );
      if (!vRes.ok) {
        const t = await vRes.text();
        return new Response(
          JSON.stringify({ error: "verification failed", detail: t }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const vData = await vRes.json();
      return new Response(
        JSON.stringify({
          verification: vData.choices?.[0]?.message?.content ?? "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Streaming critique mode
    // Pull recent site articles to ground responses
    let siteContext = "";
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: posts } = await sb
        .from("posts")
        .select("title, content")
        .order("created_at", { ascending: false })
        .limit(25);
      if (posts && posts.length) {
        const snippets = posts.map((p: any) =>
          `### ${p.title}\n${String(p.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 700)}`
        ).join("\n\n");
        siteContext = `\n\n--- مقالات موقع "وهم التطور" (مصادرك الداخلية — استشهد منها بصيغة [مقال: العنوان]) ---\n${snippets}`;
      }
    } catch (_e) { /* non-fatal */ }

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + siteContext },
            ...(messages ?? []),
          ],
          stream: true,
        }),
      },
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد. حاول بعد قليل." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error: "نفد رصيد الذكاء الاصطناعي. أضف رصيداً من إعدادات Lovable.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await aiRes.text();
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: t }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(aiRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});