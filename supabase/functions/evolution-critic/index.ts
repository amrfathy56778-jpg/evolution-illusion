// Edge function: نقد التطور بالذكاء الاصطناعي عبر Lovable AI Gateway
// يستخدم أحدث إصدار من Gemini تلقائياً

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

const VERIFY_PROMPT = `أنت مدقق علمي صارم. ستراجع رداً قدمه ناقد للتطور. مهمتك:
1. تحقق من دقة الادعاءات العلمية المذكورة.
2. تحقق من أن المصادر المذكورة حقيقية ومرتبطة بالموضوع.
3. أشر إلى أي مبالغة أو خطأ علمي.
4. أعطِ تقييماً نهائياً: ✅ موثوق / ⚠️ يحتاج مراجعة / ❌ يحتوي أخطاء.

اكتب تقريرك بالعربية، مختصر (3-6 أسطر)، يبدأ بالتقييم.`;

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
            { role: "system", content: SYSTEM_PROMPT },
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