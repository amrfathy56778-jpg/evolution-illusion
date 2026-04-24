import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { Shield, Check, X, UserPlus, Trash2, Mail } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "لوحة الإدارة · وهم التطور" }] }),
});

const CAT: Record<string, string> = {
  critique: "نقد التطور", evolution_basics: "أساسيات التطور",
  genetics: "علم الوراثة", creation_marvels: "إبداع الخالق",
};

function Admin() {
  const { user, isStaff, isOwner, loading } = useAuth();
  const [guests, setGuests] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [mods, setMods] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");

  const load = async () => {
    if (!isStaff) return;
    const { data: gp } = await supabase.from("guest_posts").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setGuests(gp ?? []);
    if (isOwner) {
      const { data: inv } = await supabase.from("admin_invites").select("*").order("created_at", { ascending: false });
      setInvites(inv ?? []);
      const { data: rls } = await supabase.from("user_roles").select("*, profiles!inner(email, display_name)").in("role", ["moderator", "owner"]);
      setMods(rls ?? []);
    }
  };
  useEffect(() => { load(); }, [isStaff, isOwner]);

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">جارٍ التحميل…</div>;
  if (!user) return <div className="glass rounded-2xl p-8 text-center"><p>يجب تسجيل الدخول.</p><Link to="/auth" className="inline-block mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">دخول</Link></div>;
  if (!isStaff) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">لا تملك صلاحيات إدارية.</div>;

  const review = async (id: string, approve: boolean) => {
    const g = guests.find(x => x.id === id);
    if (!g) return;
    if (approve) {
      const { error: e1 } = await supabase.from("posts").insert({
        title: g.title, content: g.content, category: g.category,
        author_id: null, author_name: `${g.guest_name} (ضيف)`,
      });
      if (e1) { toast.error(e1.message); return; }
    }
    const { error } = await supabase.from("guest_posts").update({
      status: approve ? "approved" : "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(approve ? "تم النشر" : "تم الرفض"); load(); }
  };

  const addInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(newEmail);
    if (!parsed.success) { toast.error("بريد غير صالح"); return; }
    const { error } = await supabase.from("admin_invites").insert({ email: parsed.data.toLowerCase(), invited_by: user.id });
    if (error) toast.error(error.message); else { toast.success("تمت الدعوة"); setNewEmail(""); load(); }
  };

  const removeInvite = async (id: string) => {
    await supabase.from("admin_invites").delete().eq("id", id); load();
  };

  const removeMod = async (roleId: string) => {
    if (!confirm("إزالة المشرف؟")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast.error(error.message); else { toast.success("تمت الإزالة"); load(); }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold text-primary">
          <Shield className="h-3.5 w-3.5" /> {isOwner ? "لوحة المالك" : "لوحة المشرف"}
        </div>
        <h1 className="text-3xl font-black text-gradient-emerald">الإدارة</h1>
      </div>

      {/* Guest posts review */}
      <section className="space-y-3">
        <h2 className="font-bold flex items-center gap-2"><Mail className="h-4 w-4"/> منشورات الضيوف ({guests.length})</h2>
        {guests.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">لا توجد منشورات في انتظار المراجعة.</div>
        ) : guests.map(g => (
          <div key={g.id} className="glass rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-white/10">{CAT[g.category]}</span>
              <span className="text-muted-foreground">{g.guest_name} · {g.guest_email}</span>
            </div>
            <h3 className="font-bold">{g.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{g.content}</p>
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button onClick={()=>review(g.id, true)} className="flex-1 rounded-xl py-2 text-xs font-bold bg-primary text-primary-foreground flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5"/> قبول ونشر
              </button>
              <button onClick={()=>review(g.id, false)} className="flex-1 rounded-xl py-2 text-xs font-bold bg-destructive text-destructive-foreground flex items-center justify-center gap-1">
                <X className="h-3.5 w-3.5"/> رفض
              </button>
            </div>
          </div>
        ))}
      </section>

      {isOwner && (
        <>
          <section className="space-y-3">
            <h2 className="font-bold flex items-center gap-2"><UserPlus className="h-4 w-4"/> إضافة مشرف</h2>
            <form onSubmit={addInvite} className="glass rounded-2xl p-4 flex gap-2">
              <input type="email" placeholder="بريد جوجل للمشرف الجديد" value={newEmail} onChange={e=>setNewEmail(e.target.value)}
                className="flex-1 glass-input rounded-xl px-3 py-2 text-sm outline-none"/>
              <button type="submit" className="px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold">دعوة</button>
            </form>
            <p className="text-[11px] text-muted-foreground">سيصبح مشرفاً تلقائياً عند تسجيل دخوله بهذا البريد.</p>

            {invites.length > 0 && (
              <div className="space-y-2">
                {invites.map(i => (
                  <div key={i.id} className="glass rounded-xl p-3 flex items-center justify-between text-xs">
                    <span>{i.email} {i.used && <span className="text-primary mr-2">✓ مستخدمة</span>}</span>
                    <button onClick={()=>removeInvite(i.id)} className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5"/></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-bold flex items-center gap-2"><Shield className="h-4 w-4"/> الفريق ({mods.length})</h2>
            {mods.map((m: any) => (
              <div key={m.id} className="glass rounded-xl p-3 flex items-center justify-between text-xs">
                <span>
                  <span className="font-bold">{m.profiles?.display_name ?? m.profiles?.email}</span>
                  <span className="mr-2 px-2 py-0.5 rounded-full bg-white/10">{m.role === "owner" ? "مالك" : "مشرف"}</span>
                </span>
                {m.role !== "owner" && m.user_id !== user.id && (
                  <button onClick={()=>removeMod(m.id)} className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5"/></button>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
