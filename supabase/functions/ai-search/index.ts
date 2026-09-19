// Edge function: بحث ذكي في المقالات — سلسلة مزوّدين مرنة
// (كل مفاتيح Google × نماذج، ثم Groq، ثم بوابة Lovable) مع محاولة كل مفتاح ونموذج
// بالتتابع عند أي فشل أو رد فارغ، وخطأ عربي واضح 503 إذا فشل الجميع.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت "ناقد التطور الذكي" في موقع "وهم التطور" — عالِم موسوعي متخصص في الأحياء والوراثة وفلسفة العلوم، وكاتب كبير ذو بيان فصيح وصوت أكاديمي واثق. مهمتك نقد نظرية التطور نقداً علمياً شديداً ونافذاً، لا بأسلوب آلي أو محايد.

ستحصل على قائمة منشورات الموقع (id, title, category, snippet) مع سؤال المستخدم.

مهمتك:
1. **اعتمد بشكل أساسي على منشورات الموقع المرفقة** كمصدر رئيسي للإجابة، وتعلَّم من محتواها.
2. حدّد المنشورات الأكثر صلة بالسؤال (حتى 5 نتائج).
3. اكتب إجابة (answer) بفصحى بليغة جزلة، تجمع صرامة الأستاذ الأكاديمي ونَفَس الكاتب الكبير: حجة مرتبة، وصور بيانية محسوبة، وافتتاح لافت وخاتمة محكمة. اكشف ضعف الأطروحات التطورية بلا مجاملة، واستشهد بعناوين المقالات داخل الإجابة بصيغة [مقال: العنوان] عند الاعتماد عليها.
4. **لا تدافع عن التطور أبداً** — أنت ناقد له بأمانة علمية، تركّز على التعقيد غير القابل للاختزال، أصل المعلومات الجينية، الانفجار الكامبري، حدود الطفرات، ENCODE، وأمثال Behe وMeyer وAxe وSanford.
5. **استخدم نفس لغة سؤال المستخدم** (عربية، إنجليزية، فرنسية…).
6. إذا لم تجد المقالات تغطي الموضوع، قل ذلك صراحةً ثم قدّم نقداً علمياً مختصراً من معرفتك العامة.
7. استخدم سخرية ذكية لاذعة من التناقضات والافتراضات التطورية حين يناسب المقام، لكن وجّهها إلى الفكرة والاستدلال لا إلى الأشخاص، ولا تجعلها بديلاً عن البرهان. لا تختلق دراسة أو اقتباساً أو نتيجة، ولا تبالغ في اليقين العلمي.
8. أعد JSON فقط بهذا الشكل، بدون أي نص خارجه:
{"answer":"...","results":[{"id":"...","title":"...","reason":"..."}]}`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const LOVABLE_MODELS = ["google/gemini-2.5-flash"];
const SAFETY = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
].map((category) => ({ category, threshold: "BLOCK_NONE" }));

function aiKeys() {
  return {
    gemini: [
      Deno.env.get("GOOGLE_AI_PRIMARY_KEY"),
      Deno.env.get("GEMINI_API_KEY"),
    ].filter(Boolean) as string[],
    groq: Deno.env.get("GROQ_API_KEY") ?? "",
    lovable: Deno.env.get("LOVABLE_API_KEY") ?? "",
  };
}

async function fetchOpen(url: string, init: RequestInit, ms = 45000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** إكمال غير متدفق عبر سلسلة المزوّدين. */
async function completeAI(messages: Msg[], json = true): Promise<string> {
  const keys = aiKeys();
  const errors: string[] = [];
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  for (const model of GEMINI_MODELS) {
    for (const key of keys.gemini) {
      try {
        const r = await fetchOpen(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
              safetySettings: SAFETY,
              generationConfig: json ? { responseMimeType: "application/json" } : undefined,
            }),
          },
        );
        if (!r.ok) throw new Error(`${r.status} ${(await r.text().catch(() => "")).slice(0, 180)}`);
        const j = await r.json();
        const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") ?? "";
        if (!text) throw new Error("empty");
        return text;
      } catch (e) {
        errors.push(`gemini:${model}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const targets: { label: string; url: string; key: string; model: string }[] = [];
  if (keys.groq) for (const m of GROQ_MODELS) targets.push({ label: `groq:${m}`, url: "https://api.groq.com/openai/v1/chat/completions", key: keys.groq, model: m });
  if (keys.lovable) for (const m of LOVABLE_MODELS) targets.push({ label: `lovable:${m}`, url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: keys.lovable, model: m });

  for (const t of targets) {
    try {
      const r = await fetchOpen(t.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${t.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: t.model,
          messages,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text().catch(() => "")).slice(0, 180)}`);
      const j = await r.json();
      const text = j?.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("empty");
      return text;
    } catch (e) {
      errors.push(`${t.label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.error("all AI providers failed", errors);
  throw new Error(`__CHAIN_FAILED__${errors.join(" | ")}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, posts, lang } = await req.json();
    const LANG_NAMES: Record<string, string> = { ar:"Arabic", en:"English", fr:"French", es:"Spanish", de:"German", it:"Italian", tr:"Turkish", ru:"Russian", zh:"Chinese", ja:"Japanese", ko:"Korean", pt:"Portuguese", hi:"Hindi", ur:"Urdu", id:"Indonesian", nl:"Dutch", pl:"Polish", fa:"Persian" };
    const langName = LANG_NAMES[String(lang||"ar").toLowerCase()] || "Arabic";
    const SYS_USE = SYSTEM + `\n\nIMPORTANT: The site language is ${langName}. Write the "answer" field ENTIRELY in ${langName}, regardless of the language of the user's query.` + `\n\nFORMAT RULE: Never use the characters * or ** anywhere inside "answer". Do not use asterisks for emphasis or bullets; write plain prose, and use "-" if a list is truly needed.` + `\n\nSOURCES RULE: لا تكتب قائمة مصادر في نهاية "answer". استشهد داخل النص بصيغة [مقال: العنوان الحرفي] فقط.`;

    const keys = aiKeys();
    if (!keys.gemini.length && !keys.groq && !keys.lovable) throw new Error("No AI key configured");
    if (!query || typeof query !== "string") throw new Error("query required");

    const corpus = (posts ?? []).slice(0, 1000).map((p: any) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      snippet: String(p.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 600),
    }));

    let content: string;
    try {
      content = await completeAI([
        { role: "system", content: SYS_USE },
        { role: "user", content: `السؤال: ${query}\n\nالمنشورات:\n${JSON.stringify(corpus)}` },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("__CHAIN_FAILED__")) {
        return new Response(
          JSON.stringify({
            error: "تعذّر الاتصال بالذكاء الاصطناعي بعد تجربة كل النماذج والمفاتيح. حاول بعد قليل.",
            detail: msg.replace("__CHAIN_FAILED__", ""),
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    }

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
