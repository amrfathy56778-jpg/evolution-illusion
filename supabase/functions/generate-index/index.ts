import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function fetchOpen(url: string, init: RequestInit, ms = 60000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** إكمال غير متدفق عبر سلسلة المزوّدين: Google ثم Groq ثم بوابة Lovable. */
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
  throw new Error("__CHAIN_FAILED__");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (new URL(req.url).searchParams.get("models") === "1") {
      const k = aiKeys();
      const out: Record<string, unknown> = {};
      try {
        const r = await fetchOpen(`https://generativelanguage.googleapis.com/v1beta/models?key=${k.gemini[0]}&pageSize=200`, { method: "GET" }, 20000);
        const j = await r.json();
        out.gemini = (j?.models ?? []).map((m: any) => m?.name).filter(Boolean);
      } catch (e) { out.gemini = String(e); }
      try {
        const r = await fetchOpen("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${k.groq}` } }, 20000);
        const j = await r.json();
        out.groq = (j?.data ?? []).map((m: any) => m?.id);
      } catch (e) { out.groq = String(e); }
      return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    // Verify caller is staff
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await userClient.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: uid });
    if (!isStaff) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

    // Fetch all posts
    const { data: posts, error: pErr } = await admin
      .from("posts").select("id,title,category,content").order("created_at", { ascending: false }).limit(500);
    if (pErr) throw pErr;
    if (!posts || posts.length === 0) {
      await admin.from("ai_index").upsert({ id: 1, data: [], generated_at: new Date().toISOString(), generated_by: uid });
      return new Response(JSON.stringify({ data: [] }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const list = posts.map((p) => {
      const plain = String(p.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 700);
      return `- [${p.id}] (${p.category}) العنوان: ${p.title}\n  المحتوى: ${plain}`;
    }).join("\n");

    const sys = `أنت مفهرس خبير لموقع "وهم التطور" المتخصّص في نقد نظرية التطور.
مهمتك: تصنيف المقالات إلى مجموعات موضوعية واضحة باللغة العربية الفصحى، مثل:
- "معضلات التطور"
- "الرد على أدلة التطور"
- "التعقيد غير القابل للاختزال"
- "السجل الأحفوري"
- "علم الوراثة ضد التطور"
- "إبداع الخالق"
- "أساسيات في التطور"
- "مغالطات منطقية"
(يمكنك ابتكار تصنيفات أخرى مناسبة)

أعد JSON خالص فقط بهذا الشكل بالضبط دون أي شرح أو ترميز markdown:
{"categories":[{"name":"اسم التصنيف","items":[{"id":"معرّف-المقال","title":"عنوان المقال"}]}]}

شروط:
- يجب أن يظهر كل مقال مرة واحدة فقط ضمن أنسب تصنيف.
- لا تخترع مقالات. استخدم فقط المقالات المعطاة بمعرّفاتها الحقيقية.
- **صنّف كل مقال بناءً على مضمونه الفعلي (نص المقال) وليس على عنوانه فقط** — العنوان قد يكون مضللاً أو عاماً، فاقرأ المحتوى المرفق واستخرج الموضوع الحقيقي.
- رتّب المقالات داخل كل تصنيف من الأعمّ والأهمّ مضموناً إلى الأخصّ، بحسب قوة تناول المقال لموضوع التصنيف.
- رتّب التصنيفات من الأهم إلى الأقل أهمية بحسب عدد المقالات وعمق مضمونها.`;

    const userText = `قائمة المقالات (المعرّف بين []، مع العنوان ومقتطف من المحتوى):
${list}

صنّف هذه المقالات اعتماداً على محتواها وعناوينها معاً، وأعد JSON فقط.`;

    const k = aiKeys();
    if (!k.gemini.length && !k.groq && !k.lovable) throw new Error("No AI key configured");

    let txt = "{}";
    try {
      txt = await completeAI([
        { role: "system", content: sys },
        { role: "user", content: userText },
      ], true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("__CHAIN_FAILED__")) {
        return new Response(JSON.stringify({ error: "خدمات الذكاء الاصطناعي غير متاحة حالياً، حاول بعد قليل." }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
      }
      throw e;
    }
    let parsed: any;
    try { parsed = JSON.parse(txt); } catch {
      const m = txt.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { categories: [] };
    }
    const validIds = new Set(posts.map((p) => String(p.id)));
    const titleById = new Map(posts.map((p) => [String(p.id), p.title]));
    const categories = Array.isArray(parsed?.categories) ? parsed.categories : [];
    const cleaned = categories
      .map((c: any) => ({
        name: String(c?.name ?? "").trim().slice(0, 80),
        items: Array.isArray(c?.items) ? c.items
          .map((it: any) => ({ id: String(it?.id ?? "").trim(), title: String(it?.title ?? "").trim() }))
          .filter((it: any) => validIds.has(it.id))
          .map((it: any) => ({ id: it.id, title: titleById.get(it.id) ?? it.title }))
        : [],
      }))
      .filter((c: any) => c.name && c.items.length > 0);

    await admin.from("ai_index").upsert({ id: 1, data: cleaned, generated_at: new Date().toISOString(), generated_by: uid });
    return new Response(JSON.stringify({ data: cleaned }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});