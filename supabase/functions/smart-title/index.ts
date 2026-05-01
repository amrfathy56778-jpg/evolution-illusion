const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { content, category } = await req.json();
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_KEY && !KEY) throw new Error("No AI key configured");
    const plain = String(content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
    if (plain.length < 30) {
      return new Response(JSON.stringify({ error: "المحتوى قصير جداً" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const sys = "أنت محرر ماهر في موقع \"وهم التطور\" المتخصص بنقد التطور. اقترح عنواناً عربياً موجزاً (5-12 كلمة) جذاباً علمياً نقدياً، بدون اقتباس أو شرح، فقط العنوان.";
    const userText = `القسم: ${category ?? "غير محدد"}\n\nالمحتوى:\n${plain}\n\nأعطني العنوان فقط.`;

    if (GEMINI_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
      const gr = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
        }),
      });
      if (!gr.ok) {
        const t = await gr.text();
        return new Response(JSON.stringify({ error: "Gemini error", detail: t }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const gj = await gr.json();
      let title = (gj?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "").trim();
      title = title.replace(/^["'«»\s]+|["'«»\s]+$/g, "").replace(/^العنوان[:：]?\s*/i, "").slice(0, 200);
      return new Response(JSON.stringify({ title }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userText },
        ],
      }),
    });
    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول لاحقاً." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "نفد الرصيد." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    let title = (j?.choices?.[0]?.message?.content ?? "").trim();
    title = title.replace(/^["'«»\s]+|["'«»\s]+$/g, "").replace(/^العنوان[:：]?\s*/i, "").slice(0, 200);
    return new Response(JSON.stringify({ title }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});