// Send notification emails to subscribers via Resend
// Trigger types:
//  - "new_post"          → notifies readers in the matching category about a new published post
//  - "guest_submitted"   → notifies staff (publishers) of a new guest post awaiting review
//  - "guest_approved"    → notifies the original guest author that their post was accepted

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_LABELS: Record<string, string> = {
  critique: "نقد التطور",
  evolution_basics: "أساسيات التطور",
  genetics: "الوراثة",
  creation_marvels: "روائع الخلق",
};

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND = Deno.env.get("RESEND_API_KEY");
  if (!RESEND) throw new Error("RESEND_API_KEY missing");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "وهم التطور <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error("Resend error", r.status, t);
    return { ok: false, error: t };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const type = String(body.type || "");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const origin = req.headers.get("origin") || "https://evolution-illusion.lovable.app";

    if (type === "new_post") {
      const { post } = body;
      if (!post?.id || !post?.title || !post?.category) {
        return new Response(JSON.stringify({ error: "post required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const { data: subs } = await sb
        .from("notification_subscriptions")
        .select("email, all_categories, categories")
        .eq("kind", "reader");
      const targets = (subs || []).filter((s: any) =>
        s.all_categories || (Array.isArray(s.categories) && s.categories.includes(post.category))
      );
      const catLabel = CATEGORY_LABELS[post.category] || post.category;
      const url = `${origin}/post/${post.id}`;
      const html = `<div dir="rtl" style="font-family:Arial;line-height:1.7"><h2>منشور جديد · ${catLabel}</h2><h3><a href="${url}">${post.title}</a></h3><p><a href="${url}" style="background:#10b981;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">قراءة المنشور</a></p><hr/><p style="font-size:12px;color:#888">أنت تتلقى هذا البريد لأنك مشترك في إشعارات موقع وهم التطور.</p></div>`;
      const results = await Promise.all(targets.map((t: any) => sendEmail(t.email, `📰 ${post.title}`, html)));
      return new Response(JSON.stringify({ ok: true, sent: results.filter((r) => r.ok).length, total: targets.length }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (type === "guest_submitted") {
      const { guest_post } = body;
      const { data: staffSubs } = await sb
        .from("notification_subscriptions")
        .select("email")
        .in("kind", ["publisher", "staff"]);
      const html = `<div dir="rtl" style="font-family:Arial;line-height:1.7"><h2>منشور ضيف جديد بانتظار المراجعة</h2><p><strong>${guest_post.guest_name}</strong> أرسل: ${guest_post.title}</p><p><a href="${origin}/admin">مراجعة الآن</a></p></div>`;
      const results = await Promise.all((staffSubs || []).map((t: any) => sendEmail(t.email, `🆕 منشور ضيف بانتظار المراجعة`, html)));
      return new Response(JSON.stringify({ ok: true, sent: results.filter((r) => r.ok).length }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (type === "guest_approved") {
      const { to, title, post_id } = body;
      if (!to) return new Response(JSON.stringify({ error: "to required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      const html = `<div dir="rtl" style="font-family:Arial;line-height:1.7"><h2>تم قبول منشورك 🎉</h2><p>تم نشر مقالك "<strong>${title}</strong>" على موقع وهم التطور.</p>${post_id ? `<p><a href="${origin}/post/${post_id}">عرض المنشور</a></p>` : ""}</div>`;
      const r = await sendEmail(to, `✅ تم قبول منشورك`, html);
      return new Response(JSON.stringify(r), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown type" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});