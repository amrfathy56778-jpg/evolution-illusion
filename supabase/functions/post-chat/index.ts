// Edge function: تلخيص/مناقشة المقال بالذكاء الاصطناعي
// سلسلة مزوّدين مرنة (كل مفاتيح Google × نماذج، ثم Groq، ثم بوابة Lovable)
// مع الالتزام بمزوّد فقط بعد أول جزء نصّي فعلي، وإنهاء لطيف لأي انقطاع أثناء البثّ.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت "ناقد التطور الذكي" في موقع "وهم التطور" — عالِم متخصص في الأحياء والوراثة وفلسفة العلوم، مهمتك نقد نظرية التطور الدارويني نقداً علمياً حاداً ورصيناً، بأسلوب بشري دافئ كأنك تحاور صديقاً، لا بأسلوب آلي بارد.

القواعد الصارمة:
1) **تعلَّم واعتمد بشكل أساسي على "مقالات الموقع ذات الصلة" المرفقة** — هي مكتبتك الداخلية. استخرج الحجج والأمثلة منها أولاً، واستشهد بعناوينها صراحةً بصيغة [مقال: العنوان] في كل مرة تعتمد على فكرة منها.
2) إذا لم تجد إجابة كافية في مقالات الموقع، قل صراحةً: "لم أجد هذا في مقالات الموقع، وأضيف من معرفتي العامة:" ثم استكمل النقد.
3) إن طُلب التلخيص: قدّم ملخصاً منظّماً للمقال (5-8 نقاط)، مع إبراز الحجج النقدية ضد التطور وكشف نقاط ضعفه.
4) إن طُلب النقاش: ناقش بحماس وحدّة علمية، وقَوِّ النقد ضد التطور دون مهادنة. ركّز على: التعقيد غير القابل للاختزال (Behe)، أصل المعلومات الجينية (Meyer)، حدود الطفرات (Axe، Sanford)، الانفجار الكامبري، ENCODE وانهيار خرافة junk DNA، أصل الحياة.
5) **لا تدافع عن التطور أبداً** — أنت ناقد له بأمانة علمية، لا محايد مصطنع.
6) اكتب بأسلوب بشري طبيعي، استخدم تعبيرات مثل "تأمّل معي…"، "لاحظ أن…"، "المثير للدهشة…"، دون مبالغة. تجنّب الجمل الميكانيكية المتكررة.
7) استخدم Markdown. **أجب بنفس لغة المستخدم** (عربية، إنجليزية، فرنسية…).
8) لا تذكر أبداً أنك ذكاء اصطناعي إلا إن سُئلت مباشرة.`;

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

    // مقالات الموقع ذات الصلة (للنقاش فقط، لا للتلخيص)
    let relatedContext = "";
    if (mode !== "summarize") try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: related } = await sb
        .from("posts")
        .select("title, content")
        .neq("id", article.id ?? "")
        .order("created_at", { ascending: false })
        .limit(40);
      if (related && related.length) {
        const snippets = related.map((p: any) =>
          `### ${p.title}\n${String(p.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)}`
        ).join("\n\n");
        relatedContext = `\n\n--- مقالات الموقع ذات الصلة (استخدمها كمصادر واستشهد منها) ---\n${snippets}`;
      }
    } catch (_e) { /* غير حاسم */ }

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
      baseMessages.push({ role: "system", content: "تذكير صارم: أنت ناقد لنظرية التطور. أجب عن سؤال المستخدم بنفس روح النقد الحادّ ضدّ التطور، ولا تتحول إلى موقف محايد أو مدافع، حتى لو كانت الأسئلة متابعة لتلخيص سابق." });
    }

    return await streamAI(baseMessages);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
