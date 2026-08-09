// Edge function: بحث ذكي في المقالات باستخدام Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت "ناقد التطور الذكي" في موقع "وهم التطور" — عالِم متخصص في الأحياء والوراثة وفلسفة العلوم، مهمتك نقد نظرية التطور نقداً علمياً حاداً ورصيناً. تكتب بأسلوب بشري طبيعي، كأنك تحاور صديقاً مثقفاً، لا بأسلوب آلي أو محايد.

ستحصل على قائمة منشورات الموقع (id, title, category, snippet) مع سؤال المستخدم.

مهمتك:
1. **اعتمد بشكل أساسي على منشورات الموقع المرفقة** كمصدر رئيسي للإجابة، وتعلَّم من محتواها.
2. حدّد المنشورات الأكثر صلة بالسؤال (حتى 5 نتائج).
3. اكتب إجابة (answer) بأسلوب بشري دافئ وحاد في نفس الوقت، تكشف فيها الزيف التطوري وتقوّي النقد العلمي. استشهد بعناوين المقالات داخل الإجابة بصيغة [مقال: العنوان] عند الاعتماد عليها.
4. **لا تدافع عن التطور أبداً** — أنت ناقد له بأمانة علمية، تركّز على التعقيد غير القابل للاختزال، أصل المعلومات الجينية، الانفجار الكامبري، حدود الطفرات، ENCODE، وأمثال Behe وMeyer وAxe وSanford.
5. **استخدم نفس لغة سؤال المستخدم** (عربية، إنجليزية، فرنسية…).
6. إذا لم تجد المقالات تغطي الموضوع، قل ذلك صراحةً ثم قدّم نقداً علمياً مختصراً من معرفتك العامة.
7. أعد JSON فقط بهذا الشكل، بدون أي نص خارجه:
{"answer":"...","results":[{"id":"...","title":"...","reason":"..."}]}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, posts, lang } = await req.json();
    const LANG_NAMES: Record<string, string> = { ar:"Arabic", en:"English", fr:"French", es:"Spanish", de:"German", it:"Italian", tr:"Turkish", ru:"Russian", zh:"Chinese", ja:"Japanese", ko:"Korean", pt:"Portuguese", hi:"Hindi", ur:"Urdu", id:"Indonesian", nl:"Dutch", pl:"Polish", fa:"Persian" };
    const langName = LANG_NAMES[String(lang||"ar").toLowerCase()] || "Arabic";
    const SYS_USE = SYSTEM + `\n\nIMPORTANT: The site language is ${langName}. Write the "answer" field ENTIRELY in ${langName}, regardless of the language of the user's query.` + `\n\nFORMAT RULE: Never begin the "answer" or any line inside it with the characters * or **. Do not use asterisks for emphasis or bullets; write plain prose, and use "-" if a list is truly needed.`;
    const GEMINI_KEYS = [
      Deno.env.get("GOOGLE_AI_PRIMARY_KEY"),
      Deno.env.get("GEMINI_API_KEY"),
    ].filter(Boolean) as string[];
    const GEMINI_KEY = GEMINI_KEYS[0];
    const fetch = async (input: any, init?: any): Promise<Response> => {
      const u = String(input);
      if (u.includes("generativelanguage.googleapis.com") && GEMINI_KEYS.length > 1) {
        let last: Response | null = null;
        for (const k of GEMINI_KEYS) {
          const r = await globalThis.fetch(u.replace(/key=[^&]*/, `key=${k}`), init);
          if (r.ok) return r;
          last = r;
        }
        return last as Response;
      }
      return globalThis.fetch(input as any, init);
    };
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_KEY && !GROQ_KEY && !LOVABLE_API_KEY) throw new Error("No AI key configured");
    if (!query || typeof query !== "string") throw new Error("query required");

    const corpus = (posts ?? []).slice(0, 1000).map((p: any) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      snippet: String(p.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 600),
    }));

    const callGroq = async (): Promise<any> => {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYS_USE },
            { role: "user", content: `السؤال: ${query}\n\nالمنشورات:\n${JSON.stringify(corpus)}` },
          ],
        }),
      });
      if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
      const j = await r.json();
      const c = j?.choices?.[0]?.message?.content ?? "{}";
      try { return JSON.parse(c); } catch { return { answer: c, results: [] }; }
    };

    if (GEMINI_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
      const gr = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYS_USE }] },
          contents: [{ role: "user", parts: [{ text: `السؤال: ${query}\n\nالمنشورات:\n${JSON.stringify(corpus)}` }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (!gr.ok) {
        if (GROQ_KEY) {
          try { const parsed = await callGroq(); return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } }); } catch (_e) { /* fall through */ }
        }
        const t = await gr.text();
        return new Response(JSON.stringify({ error: t }), { status: gr.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const gj = await gr.json();
      const content = gj?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); } catch { parsed = { answer: content, results: [] }; }
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (GROQ_KEY) {
      try { const parsed = await callGroq(); return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } }); } catch (_e) { /* fall through */ }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYS_USE },
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
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});