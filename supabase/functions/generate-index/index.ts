import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
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
      const plain = String(p.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
      return `- [${p.id}] (${p.category}) ${p.title}${plain ? " — " + plain : ""}`;
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
- رتّب التصنيفات من الأهم إلى الأقل أهمية.`;

    const userText = `قائمة المقالات (المعرّف بين []):
${list}

صنّف هذه المقالات وأعد JSON فقط.`;

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("Missing LOVABLE_API_KEY");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userText },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول لاحقاً." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "نفد الرصيد." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      const t = await r.text();
      throw new Error(`AI gateway ${r.status}: ${t}`);
    }
    const j = await r.json();
    const txt = j?.choices?.[0]?.message?.content ?? "{}";
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