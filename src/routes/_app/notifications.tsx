import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Mail, Check, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "الإشعارات · وهم التطور" }] }),
});

const CATEGORIES: { value: "critique" | "evolution_basics" | "genetics" | "creation_marvels"; label: string }[] = [
  { value: "critique", label: "نقد التطور" },
  { value: "evolution_basics", label: "أساسيات التطور" },
  { value: "genetics", label: "الوراثة" },
  { value: "creation_marvels", label: "روائع الخلق" },
];

function NotificationsPage() {
  const { user, isStaff } = useAuth();
  const [email, setEmail] = useState("");
  const [allCats, setAllCats] = useState(true);
  const [cats, setCats] = useState<string[]>([]);
  const [kind, setKind] = useState<"reader" | "publisher" | "staff">("reader");
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (!user) return;
    supabase.from("notification_subscriptions").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setEmail(data.email);
          setAllCats(data.all_categories);
          setCats(data.categories || []);
          setKind(data.kind);
        }
      });
  }, [user]);

  const toggleCat = (c: string) => setCats((p) => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("البريد مطلوب"); return; }
    setLoading(true);
    try {
      const payload: any = {
        email: email.trim().toLowerCase(),
        kind: isStaff ? kind : "reader",
        all_categories: allCats,
        categories: allCats ? [] : cats,
        user_id: user?.id ?? null,
      };
      if (existing) {
        const { error } = await supabase.from("notification_subscriptions").update(payload).eq("id", existing.id);
        if (error) throw error;
        toast.success("تم تحديث تفضيلاتك ✓");
      } else {
        const { data, error } = await supabase.from("notification_subscriptions").insert(payload).select().single();
        if (error) throw error;
        setExisting(data);
        toast.success("تم تسجيل اشتراكك ✓ ستتلقى الإشعارات على Gmail");
      }
    } catch (err: any) {
      toast.error(err?.message?.includes("duplicate") ? "هذا البريد مشترك بالفعل" : (err?.message || "حدث خطأ"));
    } finally { setLoading(false); }
  };

  const unsubscribe = async () => {
    if (!existing) return;
    if (!confirm("إلغاء الاشتراك في الإشعارات؟")) return;
    setLoading(true);
    const { error } = await supabase.from("notification_subscriptions").delete().eq("id", existing.id);
    if (error) toast.error(error.message); else { setExisting(null); toast.success("تم الإلغاء"); }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">إشعارات Gmail</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        اشترك لتصلك إشعارات بالمنشورات الجديدة على بريد Gmail. {isStaff ? "بصفتك مشرفاً يمكنك أيضاً تلقي إشعارات بالمنشورات الواردة من ضيوف." : ""}
      </p>

      {!user && (
        <div className="mb-4 p-3 rounded-2xl border border-primary/30 bg-primary/5 text-xs">
          يمكنك الاشتراك بدون حساب. للإدارة لاحقاً <Link to="/auth" className="text-primary font-bold underline">سجّل الدخول</Link> (Google أو بريد).
        </div>
      )}

      <form onSubmit={submit} className="glass rounded-3xl p-5 space-y-5">
        <label className="block">
          <span className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> بريد Gmail</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={!!user}
            className="glass-input w-full rounded-2xl px-4 py-2.5 text-sm" placeholder="you@gmail.com" />
        </label>

        {isStaff && (
          <label className="block">
            <span className="text-xs font-bold mb-1.5 block">نوع الاشتراك</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="glass-input w-full rounded-2xl px-4 py-2.5 text-sm">
              <option value="reader">قارئ — منشورات جديدة</option>
              <option value="publisher">ناشر — منشورات الضيوف الجديدة</option>
              <option value="staff">مشرف — كل ما سبق</option>
            </select>
          </label>
        )}

        <div>
          <label className="flex items-center gap-2 mb-2 text-sm cursor-pointer">
            <input type="checkbox" checked={allCats} onChange={(e) => setAllCats(e.target.checked)} />
            <span>كل الأقسام</span>
          </label>
          {!allCats && (
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <label key={c.value} className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer text-xs border ${cats.includes(c.value) ? "border-primary bg-primary/10" : "border-white/10"}`}>
                  <input type="checkbox" checked={cats.includes(c.value)} onChange={() => toggleCat(c.value)} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {existing ? "حفظ التعديلات" : "تسجيل الاشتراك"}
          </button>
          {existing && (
            <button type="button" onClick={unsubscribe} disabled={loading} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl border border-destructive/40 text-destructive text-xs font-bold">
              <Trash2 className="h-3.5 w-3.5" /> إلغاء
            </button>
          )}
        </div>
      </form>
    </div>
  );
}