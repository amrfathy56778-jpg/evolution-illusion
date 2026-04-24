import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PenLine, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/guest-post")({
  component: GuestPost,
  head: () => ({ meta: [{ title: "النشر كضيف · وهم التطور" }] }),
});

const schema = z.object({
  guest_name: z.string().trim().min(2, "الاسم قصير").max(100),
  guest_email: z.string().trim().email("بريد غير صالح").max(255),
  title: z.string().trim().min(3, "العنوان قصير").max(200),
  content: z.string().trim().min(20, "المحتوى قصير").max(10000),
  category: z.enum(["critique", "evolution_basics", "genetics", "creation_marvels"]),
});

const CATEGORIES = [
  { v: "critique", l: "نقد التطور", c: "var(--c-critique)" },
  { v: "evolution_basics", l: "أساسيات التطور", c: "var(--c-evolution)" },
  { v: "genetics", l: "علم الوراثة", c: "var(--c-genetics)" },
  { v: "creation_marvels", l: "إبداع الخالق", c: "var(--c-creation)" },
] as const;

function GuestPost() {
  const { isStaff } = useAuth();
  const [form, setForm] = useState({ guest_name: "", guest_email: "", title: "", content: "", category: "critique" as const });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (isStaff) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 text-center">
        <div className="glass rounded-3xl p-8 space-y-4">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold" style={{ color: "var(--c-guest)" }}>
            <PenLine className="h-3.5 w-3.5" /> إضافة منشور
          </div>
          <h1 className="text-3xl font-black text-gradient-emerald">هذه الصفحة مخصّصة للضيوف فقط</h1>
          <p className="text-sm text-muted-foreground">بما أنك مشرف، أضف المنشورات مباشرةً من صفحات الأقسام.</p>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Link to="/critique" className="glass-input rounded-2xl px-4 py-3 text-sm font-bold hover:bg-white/10 transition">نقد التطور</Link>
            <Link to="/evolution" className="glass-input rounded-2xl px-4 py-3 text-sm font-bold hover:bg-white/10 transition">أساسيات التطور</Link>
            <Link to="/genetics" className="glass-input rounded-2xl px-4 py-3 text-sm font-bold hover:bg-white/10 transition">علم الوراثة</Link>
            <Link to="/creation" className="glass-input rounded-2xl px-4 py-3 text-sm font-bold hover:bg-white/10 transition">إبداع الخالق</Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.from("guest_posts").insert(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center glass rounded-3xl p-8 space-y-3 glow-warm">
        <CheckCircle2 className="h-14 w-14 mx-auto" style={{ color: "var(--c-guest)" }} />
        <h2 className="text-2xl font-bold">تم إرسال منشورك</h2>
        <p className="text-sm text-muted-foreground">سيُراجَع من قبل المشرفين قبل النشر. شكراً لمساهمتك!</p>
        <Link to="/" className="inline-block mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold" style={{ color: "var(--c-guest)" }}>
          <PenLine className="h-3.5 w-3.5" /> النشر كضيف · يخضع للمراجعة
        </div>
        <h1 className="text-3xl font-black text-gradient-emerald">شارك طرحك</h1>
        <p className="text-xs text-muted-foreground">سيراجع المشرفون منشورك قبل نشره للجميع</p>
      </div>

      <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="اسمك" value={form.guest_name} onChange={e=>setForm({...form, guest_name: e.target.value})}/>
          <input type="email" className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="بريدك الإلكتروني" value={form.guest_email} onChange={e=>setForm({...form, guest_email: e.target.value})}/>
        </div>
        <select value={form.category} onChange={e=>setForm({...form, category: e.target.value as any})}
          className="glass-input rounded-xl px-3 py-2.5 text-sm w-full outline-none">
          {CATEGORIES.map(c => <option key={c.v} value={c.v} className="bg-background">{c.l}</option>)}
        </select>
        <input className="glass-input rounded-xl px-3 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="عنوان المنشور" value={form.title} onChange={e=>setForm({...form, title: e.target.value})}/>
        <textarea rows={10} className="glass-input rounded-xl px-3 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
          placeholder="اكتب محتوى منشورك هنا… كن واضحاً ومستنداً للمراجع كلما أمكن."
          value={form.content} onChange={e=>setForm({...form, content: e.target.value})}/>
        <button type="submit" disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:opacity-90 transition glow-warm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--c-guest)", color: "oklch(0.15 0.05 50)" }}>
          <Send className="h-4 w-4" /> {loading ? "جارٍ الإرسال…" : "إرسال للمراجعة"}
        </button>
      </form>
    </div>
  );
}
