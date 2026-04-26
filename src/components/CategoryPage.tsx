import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, X, ImagePlus, ImageOff } from "lucide-react";
import { RichEditor } from "@/components/RichEditor";
import { PostAIButton } from "@/components/PostAIChat";

type Cat = "critique" | "evolution_basics" | "genetics" | "creation_marvels";

export default function CategoryPage({ category, title, color, emoji, description }:
  { category: Cat; title: string; color: string; emoji: string; description: string }) {
  const { isStaff, user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(""); const [c, setC] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("posts").select("*").eq("category", category).order("created_at", { ascending: false });
    setPosts(data ?? []);
  };
  useEffect(() => { load(); }, [category]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const plain = c.replace(/<[^>]+>/g, "").trim();
    if (t.trim().length < 3 || plain.length < 20) { toast.error("العنوان والمحتوى قصيران"); return; }
    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      title: t.trim(), content: c.trim(), category, cover_image_url: cover,
      author_id: user!.id, author_name: user!.email?.split("@")[0] ?? "مشرف",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم النشر"); setT(""); setC(""); setCover(null); setOpen(false); load();
  };

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("حجم الصورة الأقصى 8MB"); return; }
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `covers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-media").upload(path, f, { contentType: f.type });
      if (error) throw error;
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      setCover(data.publicUrl);
    } catch (err: any) { toast.error("تعذّر رفع الغلاف: " + err.message); }
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
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={()=>coverRef.current?.click()}
              className="glass-input rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 hover:bg-white/10">
              <ImagePlus className="h-3.5 w-3.5"/> {cover ? "تغيير صورة الغلاف" : "إضافة صورة غلاف (اختياري)"}
            </button>
            {cover && (
              <button type="button" onClick={()=>setCover(null)}
                className="glass-input rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 hover:bg-white/10 text-destructive">
                <ImageOff className="h-3.5 w-3.5"/> إزالة الغلاف
              </button>
            )}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={onCoverFile}/>
          </div>
          {cover && <img src={cover} alt="غلاف" className="w-full max-h-60 object-cover rounded-2xl"/>}
          <RichEditor value={c} onChange={setC} placeholder="اكتب المحتوى هنا… يمكنك إضافة صور وفيديوهات وروابط وتنسيق النص"/>
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
            <article key={p.id} className="glass rounded-2xl p-5 hover:bg-white/5 transition"
              style={{ borderColor: `color-mix(in oklab, ${color} 25%, transparent)` }}>
              {p.cover_image_url && (
                <img src={p.cover_image_url} alt={p.title} className="w-full max-h-48 object-cover rounded-xl mb-3"/>
              )}
              <h3 className="font-bold mb-1.5">{p.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {p.content.replace(/<[^>]+>/g, " ").slice(0, 200)}…
              </p>
              <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                <div className="text-[10px] text-muted-foreground">
                  {p.author_name ?? "—"} · {new Date(p.created_at).toLocaleDateString("ar")}
                </div>
                <div className="flex items-center gap-2">
                  <PostAIButton post={{ id: p.id, title: p.title, content: p.content }} compact />
                  <Link to="/post/$id" params={{ id: p.id }} className="text-primary text-xs font-semibold hover:underline">
                    اقرأ ←
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
