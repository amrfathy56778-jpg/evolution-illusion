// Edge function: نقد التطور بالذكاء الاصطناعي
// سلسلة مزوّدين مرنة: كل مفاتيح Google × نماذج، ثم Groq، ثم بوابة Lovable.
// لا يتم "الالتزام" بمزوّد إلا بعد أن ينتج أول جزء نصّي فعلاً، وأي انقطاع في
// منتصف البثّ يُنهى بلطف مع الحفاظ على النص الذي وصل (بدل خطأ اتصال).

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
5. لا تضع قائمة مصادر أو قسم "المصادر" في نهاية الرد إطلاقاً — اكتفِ بالاستشهاد داخل النص بصيغة [مقال: العنوان] عند الاعتماد على مقال من الموقع.
6. **أجب بنفس لغة سؤال المستخدم** (إنجليزية، فرنسية، عربية...) منظماً بعناوين ونقاط.
7. إذا سُئلت عن شيء خارج تخصصك، وجّه السؤال للنقد العلمي للتطور.
8. لا تتظاهر بالحياد المُصطنع — مهمتك النقد، لكن بأمانة علمية.
9. اكتب بأسلوب بشري دافئ وحاد، كأنك تحاور صديقاً مثقفاً. تجنّب الجمل الميكانيكية. عند الاستشهاد بمقالات الموقع المرفقة استخدم صيغة [مقال: العنوان].`;

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

/** مهلة للاتصال فقط — تُلغى بعد وصول الترويسات حتى لا يُقطع البثّ. */
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
        } catch { /* انقطاع في منتصف البث: نُبقي ما وصل */ }
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      },
    });
    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-AI-Provider": attempt.label },
    });
  }
  console.error("all AI providers failed", errors);
  return new Response(
    JSON.stringify({
      error: "تعذّر الاتصال بالذكاء الاصطناعي بعد تجربة كل النماذج والمفاتيح. حاول بعد قليل.",
      detail: errors.join(" | "),
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------- handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, lang } = await req.json();
    const LANG_NAMES: Record<string, string> = {
      ar:"Arabic", en:"English", fr:"French", es:"Spanish", de:"German", it:"Italian",
      tr:"Turkish", ru:"Russian", zh:"Chinese", ja:"Japanese", ko:"Korean", pt:"Portuguese",
      hi:"Hindi", ur:"Urdu", id:"Indonesian", nl:"Dutch", pl:"Polish", fa:"Persian",
    };
    const langName = LANG_NAMES[String(lang || "ar").toLowerCase()] || "Arabic";
    const langDirective = `\n\nIMPORTANT: Respond ENTIRELY in ${langName}. The site is currently displayed in ${langName} — ignore any other language detected in the user's message.`;
    const NO_STARS = `\n\nFORMAT RULE: Never begin a reply, a line, or a paragraph with the characters * or **. Do not use asterisks for emphasis or bullets at all; write plain flowing prose, and use "-" if a list is truly needed.`;

    const keys = aiKeys();
    if (!keys.gemini.length && !keys.groq && !keys.lovable) throw new Error("No AI key configured");

    // كل مقالات الموقع (الماضية والمستقبلية) + المقاطع الأكثر صلة بالسؤال
    const lastUser = [...(Array.isArray(messages) ? messages : [])]
      .reverse().find((m: any) => m?.role === "user")?.content ?? "";
    const siteContext = await siteKnowledge(String(lastUser));

    const sys = SYSTEM_PROMPT + langDirective + NO_STARS + siteContext + CITATION_RULES;

    const convo: Msg[] = [{ role: "system", content: sys }];
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        convo.push({ role: m.role, content: m.content.slice(0, 6000) });
      }
    }

    return await streamAI(convo);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
