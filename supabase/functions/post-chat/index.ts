// Edge function: تلخيص/مناقشة المقال بالذكاء الاصطناعي
// سلسلة مزوّدين مرنة (كل مفاتيح Google × نماذج، ثم Groq، ثم بوابة Lovable)
// مع الالتزام بمزوّد فقط بعد أول جزء نصّي فعلي، وإنهاء لطيف لأي انقطاع أثناء البثّ.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت "ناقد التطور الذكي" في موقع "وهم التطور" — عالِم موسوعي متخصص في الأحياء والوراثة وفلسفة العلوم، وكاتب عربي كبير ذو بيان رفيع. مهمتك نقد نظرية التطور الدارويني نقداً علمياً شديداً ورصيناً، بصوت أكاديمي واثق لا بأسلوب آلي بارد.

القواعد الصارمة:
1) **تعلَّم واعتمد بشكل أساسي على "مقالات الموقع ذات الصلة" المرفقة** — هي مكتبتك الداخلية. استخرج الحجج والأمثلة منها أولاً، واستشهد بعناوينها صراحةً بصيغة [مقال: العنوان] في كل مرة تعتمد على فكرة منها.
2) إذا لم تجد إجابة كافية في مقالات الموقع، قل صراحةً: "لم أجد هذا في مقالات الموقع، وأضيف من معرفتي العامة:" ثم استكمل النقد.
3) إن طُلب التلخيص: قدّم ملخصاً منظّماً للمقال (5-8 نقاط)، مع إبراز الحجج النقدية ضد التطور وكشف نقاط ضعفه.
4) إن طُلب النقاش: ناقش بحماس وحدّة علمية بالغة، وقَوِّ النقد ضد التطور دون مهادنة أو لغة محايدة رخوة. ركّز على: التعقيد غير القابل للاختزال (Behe)، أصل المعلومات الجينية (Meyer)، حدود الطفرات (Axe، Sanford)، الانفجار الكامبري، ENCODE وانهيار خرافة junk DNA، أصل الحياة.
5) **لا تدافع عن التطور أبداً** — أنت ناقد له بأمانة علمية، لا محايد مصطنع.
6) اكتب بفصحى بليغة جزلة، ككاتب كبير وأستاذ أكاديمي متمكن: حجة مرتبة، وصور بيانية محسوبة، وإيقاع قوي، وافتتاح لافت وخاتمة محكمة. تجنّب الجمل الميكانيكية والإنشاء المتكلف.
7) استخدم سخرية ذكية لاذعة من تناقضات الأطروحة التطورية وافتراضاتها حين يلائم السياق، واجعل المفارقة تكشف ضعف الاستدلال؛ لكن اسخر من الفكرة لا من أصحابها، ولا تستخدم شتماً أو تحقيراً، ولا تجعل البلاغة بديلاً عن البرهان.
8) الدقة مقدمة على الحدة: لا تختلق دراسة أو اقتباساً أو نتيجة، ولا تبالغ في اليقين. اجعل كل عبارة قوية مسنودة بتحليل أو شاهد.
9) استخدم Markdown. **أجب بنفس لغة المستخدم** (عربية، إنجليزية، فرنسية…).
10) لا تذكر أبداً أنك ذكاء اصطناعي إلا إن سُئلت مباشرة.`;

// ---------------------------------------------------------------- AI chain
type Msg = { role: "system" | "user" | "assistant"; content: string };

const enc = new TextEncoder();
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

async function fetchOpen(url: string, init: RequestInit, ms = 25000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function* sseText(body: ReadableStream<Uint8Array>, pick: (j: any) => string) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      let text = "";
      try { text = pick(JSON.parse(p)) ?? ""; } catch { continue; }
      if (text) yield text;
    }
  }
}

const pickGemini = (p: any) =>
  p?.candidates?.[0]?.content?.parts?.map((x: any) => x?.text).filter(Boolean).join("") ?? "";
const pickOpenAI = (p: any) => p?.choices?.[0]?.delta?.content ?? "";

function splitMessages(messages: Msg[]) {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  return { sys, contents };
}

type Attempt = { label: string; open: () => Promise<AsyncGenerator<string>> };

function buildAttempts(messages: Msg[]): Attempt[] {
  const keys = aiKeys();
  const { sys, contents } = splitMessages(messages);
  const list: Attempt[] = [];

  for (const model of GEMINI_MODELS) {
    for (const key of keys.gemini) {
      list.push({
        label: `gemini:${model}`,
        open: async () => {
          const r = await fetchOpen(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents,
                systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
                safetySettings: SAFETY,
              }),
            },
          );
          if (!r.ok || !r.body) throw new Error(`${r.status} ${(await r.text().catch(() => "")).slice(0, 180)}`);
          return sseText(r.body, pickGemini);
        },
      });
    }
  }

  const openAiTargets: { label: string; url: string; key: string; model: string }[] = [];
  if (keys.groq) for (const m of GROQ_MODELS) openAiTargets.push({ label: `groq:${m}`, url: "https://api.groq.com/openai/v1/chat/completions", key: keys.groq, model: m });
  if (keys.lovable) for (const m of LOVABLE_MODELS) openAiTargets.push({ label: `lovable:${m}`, url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: keys.lovable, model: m });

  for (const t of openAiTargets) {
    list.push({
      label: t.label,
      open: async () => {
        const r = await fetchOpen(t.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${t.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: t.model, messages, stream: true }),
        });
        if (!r.ok || !r.body) throw new Error(`${r.status} ${(await r.text().catch(() => "")).slice(0, 180)}`);
        return sseText(r.body, pickOpenAI);
      },
    });
  }

  return list;
}

async function streamAI(messages: Msg[]): Promise<Response> {
  const errors: string[] = [];
  for (const attempt of buildAttempts(messages)) {
    let gen: AsyncGenerator<string>;
    try {
      gen = await attempt.open();
    } catch (e) {
      errors.push(`${attempt.label}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    let first: IteratorResult<string>;
    try {
      first = await gen.next();
    } catch (e) {
      errors.push(`${attempt.label}: stream ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (first.done || !first.value) { errors.push(`${attempt.label}: empty`); continue; }

    const body = new ReadableStream<Uint8Array>({
      async start(c) {
        const send = (text: string) =>
          c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
        try {
          send(first.value as string);
          for await (const chunk of gen) send(chunk);
        } catch { /* انقطاع أثناء البث: نحتفظ بما وصل */ }
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      },
    });
    return new Response(body, {
      headers: { ...cors, "Content-Type": "text/event-stream", "X-AI-Provider": attempt.label },
    });
  }
  console.error("all AI providers failed", errors);
  return new Response(
    JSON.stringify({
      error: "تعذّر الاتصال بالذكاء الاصطناعي بعد تجربة كل النماذج والمفاتيح. حاول بعد قليل.",
      detail: errors.join(" | "),
    }),
    { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

// ------------------------------------------------- site knowledge (RAG)
const CITATION_RULES = `

قواعد الاعتماد على مقالات الموقع (إلزامية):
- "فهرس مقالات الموقع" أدناه يحتوي عناوين كل مقالات الموقع، و"مقاطع المقالات الأكثر صلة" تحتوي نصوصاً منها.
- ابنِ إجابتك على هذه المقالات أولاً، واذكر داخل النص إحالة لكل فكرة مأخوذة منها بالصيغة الحرفية: [مقال: العنوان]
- انسخ العنوان حرفياً كما ورد في الفهرس، بدون تغيير أو ترجمة أو اختصار، وإلا لن يتحوّل إلى رابط.
- استشهد بمقالين على الأقل إذا وُجد في الفهرس ما يمسّ الموضوع، ولو كانت الصلة جزئية.
- لا تختلق عنواناً غير موجود في الفهرس.
- إذا لم يغطِّ الفهرس الموضوع إطلاقاً، قل ذلك صراحةً ثم أجب من معرفتك العامة.
- لا تكتب قائمة مصادر في النهاية — الإحالات داخل النص فقط.`;

const normAr = (s: string) =>
  s.replace(/[\u064B-\u065F\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

const plainText = (html: unknown) =>
  String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** فهرس كامل بعناوين كل المقالات + نصوص الأكثر صلة بالسؤال. */
async function siteKnowledge(query: string, excludeId?: string): Promise<string> {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: all } = await sb
      .from("posts")
      .select("id, title, category")
      .order("created_at", { ascending: false })
      .limit(5000);
    const posts = (all ?? []).filter((p: any) => p.id !== excludeId);
    if (!posts.length) return "";

    const tokens = Array.from(new Set(normAr(query).split(" ").filter((w) => w.length > 2))).slice(0, 8);

    const picked = new Map<string, any>();
    const scored = posts
      .map((p: any) => {
        const t = normAr(p.title ?? "");
        let s = 0;
        for (const w of tokens) if (t.includes(w)) s += 3;
        return { p, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    for (const x of scored.slice(0, 12)) picked.set(x.p.id, x.p);

    for (const w of tokens.slice(0, 4)) {
      if (picked.size >= 18) break;
      const { data: hits } = await sb
        .from("posts")
        .select("id, title")
        .ilike("content", `%${w}%`)
        .order("created_at", { ascending: false })
        .limit(6);
      for (const h of hits ?? []) if (h.id !== excludeId) picked.set(h.id, h);
    }

    for (const p of posts) {
      if (picked.size >= 10) break;
      picked.set(p.id, p);
    }

    const ids = Array.from(picked.keys()).slice(0, 18);
    const { data: full } = await sb.from("posts").select("id, title, content").in("id", ids);

    const excerpts = (full ?? [])
      .map((p: any) => `### ${p.title}\n${plainText(p.content).slice(0, 1400)}`)
      .join("\n\n");

    const catalogue = posts
      .slice(0, 800)
      .map((p: any) => `- ${p.title}${p.category ? ` (${p.category})` : ""}`)
      .join("\n");

    return `\n\n--- فهرس مقالات الموقع "وهم التطور" (كل المقالات: ${posts.length}) ---\n${catalogue}` +
      `\n\n--- مقاطع المقالات الأكثر صلة بالسؤال ---\n${excerpts}`;
  } catch (e) {
    console.error("siteKnowledge failed", e);
    return "";
  }
}

// ---------------------------------------------------------------- handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { article, mode, messages, lang } = await req.json();
    const LANG_NAMES: Record<string, string> = { ar:"Arabic", en:"English", fr:"French", es:"Spanish", de:"German", it:"Italian", tr:"Turkish", ru:"Russian", zh:"Chinese", ja:"Japanese", ko:"Korean", pt:"Portuguese", hi:"Hindi", ur:"Urdu", id:"Indonesian", nl:"Dutch", pl:"Polish", fa:"Persian" };
    const langName = LANG_NAMES[String(lang||"ar").toLowerCase()] || "Arabic";
    const SYS_USE = SYSTEM + `\n\nIMPORTANT: The site is currently displayed in ${langName}. Respond ENTIRELY in ${langName}, regardless of the language of the article or user's message.` + `\n\nFORMAT RULE: Never use the characters * or ** anywhere in your reply — not at the start of a line, not for emphasis, not for bullets. Write plain prose, and use "-" if a list is truly needed.` + `\n\nSOURCES RULE: لا تكتب قائمة مصادر ولا قسم "المصادر" في نهاية الرد. استشهد فقط داخل النص بصيغة [مقال: العنوان] بالعنوان الحرفي للمقال كما ورد في المقالات المرفقة.`;

    const keys = aiKeys();
    if (!keys.gemini.length && !keys.groq && !keys.lovable) throw new Error("No AI key configured");
    if (!article?.title || !article?.content) {
      return new Response(JSON.stringify({ error: "article required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const plain = String(article.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
    const articleContext = `عنوان المقال: ${article.title}\n\nنص المقال:\n${plain}`;

    // كل مقالات الموقع (فهرس كامل + أكثرها صلة) — للنقاش فقط، لا للتلخيص
    let relatedContext = "";
    if (mode !== "summarize") {
      const lastUser = [...(Array.isArray(messages) ? messages : [])]
        .reverse().find((m: any) => m?.role === "user")?.content ?? "";
      const q = `${article.title} ${String(lastUser)}`;
      relatedContext = await siteKnowledge(q, article.id) + CITATION_RULES;
    }

    const baseMessages: Msg[] = [
      { role: "system", content: SYS_USE },
      { role: "user", content: articleContext + relatedContext },
    ];

    if (mode === "summarize") {
      baseMessages.push({ role: "user", content: "لخّص المقال السابق فقط، معتمداً على نصّه وحده دون إضافة معلومات من خارجه ولا الاستشهاد بمقالات أخرى، في 5-8 نقاط واضحة، **من منظورك كناقد حادّ لنظرية التطور**: استخرج أبرز أفكار المقال، وأظهر بوضوح كيف تُضعِف التطورَ أو تكشف ثغراته، واختم بخلاصة نقدية ضدّ التطور مستخلَصة من المقال نفسه. لا تُحايد ولا تُدافع عن التطور إطلاقاً." });
    } else if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          baseMessages.push({ role: m.role, content: m.content.slice(0, 4000) });
        }
      }
      baseMessages.push({ role: "system", content: "تذكير صارم: أنت ناقد شديد لنظرية التطور وكاتب فصيح وأكاديمي متمكن. أجب بروح نقدية حادة، واستعمل سخرية ذكية من تناقضات الفكرة حين تناسب السياق، من غير سخرية من الأشخاص ومن غير أن تحل البلاغة محل الدليل. لا تتحول إلى موقف محايد أو مدافع، حتى لو كانت الأسئلة متابعة لتلخيص سابق." });
    }

    return await streamAI(baseMessages);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
