import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

type Cat = "critique" | "evolution_basics" | "genetics" | "creation_marvels";

export default function CategoryPage({ category, title, color, emoji, description }:
  { category: Cat; title: string; color: string; emoji: string; description: string }) {
  const { isStaff, user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(""); const [c, setC] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("posts").select("*").eq("category", category).order("created_at", { ascending: false });
    setPosts(data ?? []);
  };
  useEffect(() => { load(); }, [category]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (t.trim().length < 3 || c.trim().length < 20) { toast.error("العنوان والمحتوى قصيران"); return; }
    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      title: t.trim(), content: c.trim(), category,
      author_id: user!.id, author_name: user!.email?.split("@")[0] ?? "مشرف",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم النشر"); setT(""); setC(""); setOpen(false); load();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="text-5xl">{emoji}</div>
        <h1 className="text-3xl font-black" style={{ color }}>{title}</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">{description}</p>
      </div>

      {isStaff && (
        <div className="flex justify-center">
          <button onClick={()=>setOpen(!open)} className="glass rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 hover:bg-white/10"
            style={{ color }}>
            {open ? <><X className="h-3.5 w-3.5"/> إلغاء</> : <><Plus className="h-3.5 w-3.5"/> منشور جديد</>}
          </button>
        </div>
      )}

      {open && (
        <form onSubmit={create} className="glass rounded-3xl p-5 space-y-3">
          <input className="glass-input rounded-xl px-3 py-2.5 text-sm w-full outline-none" placeholder="العنوان"
            value={t} onChange={e=>setT(e.target.value)} maxLength={200}/>
          <textarea rows={8} className="glass-input rounded-xl px-3 py-2.5 text-sm w-full outline-none leading-relaxed"
            placeholder="المحتوى" value={c} onChange={e=>setC(e.target.value)} maxLength={10000}/>
          <button type="submit" disabled={busy} className="w-full rounded-xl py-2.5 font-bold text-sm disabled:opacity-50"
            style={{ background: color, color: "oklch(0.15 0.05 200)" }}>
            {busy ? "جارٍ النشر…" : "نشر"}
          </button>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">لا توجد منشورات في هذا القسم بعد.</div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <Link key={p.id} to="/post/$id" params={{ id: p.id }}
              className="block glass rounded-2xl p-5 hover:bg-white/5 transition"
              style={{ borderColor: `color-mix(in oklab, ${color} 25%, transparent)` }}>
              <h3 className="font-bold mb-1.5">{p.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{p.content.slice(0, 200)}…</p>
              <div className="text-[10px] text-muted-foreground mt-3">
                {p.author_name ?? "—"} · {new Date(p.created_at).toLocaleDateString("ar")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
