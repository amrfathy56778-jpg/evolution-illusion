import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, ArrowRight, Pencil, Save, X } from "lucide-react";
import { RichEditor, RichContent } from "@/components/RichEditor";

export const Route = createFileRoute("/_app/post/$id")({
  component: PostPage,
});

const CAT: Record<string, { l: string; c: string }> = {
  critique: { l: "نقد التطور", c: "var(--c-critique)" },
  evolution_basics: { l: "أساسيات التطور", c: "var(--c-evolution)" },
  genetics: { l: "علم الوراثة", c: "var(--c-genetics)" },
  creation_marvels: { l: "إبداع الخالق", c: "var(--c-creation)" },
};

function PostPage() {
  const { id } = useParams({ from: "/_app/post/$id" });
  const { isStaff } = useAuth();
  const [p, setP] = useState<any>(null);
  const [nf, setNf] = useState(false);
  const [edit, setEdit] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eContent, setEContent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("posts").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) setNf(true); else setP(data);
    });
  }, [id]);

  const del = async () => {
    if (!confirm("حذف المنشور؟")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); history.back(); }
  };

  const startEdit = () => {
    setETitle(p.title);
    setEContent(p.content);
    setEdit(true);
  };

  const save = async () => {
    const plain = eContent.replace(/<[^>]+>/g, "").trim();
    if (eTitle.trim().length < 3 || plain.length < 20) { toast.error("العنوان أو المحتوى قصير"); return; }
    setBusy(true);
    const { data, error } = await supabase.from("posts")
      .update({ title: eTitle.trim(), content: eContent, updated_at: new Date().toISOString() })
      .eq("id", id).select().maybeSingle();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    setP(data); setEdit(false);
  };

  if (nf) return <div className="glass rounded-2xl p-8 text-center">المنشور غير موجود.</div>;
  if (!p) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">جارٍ التحميل…</div>;

  const cat = CAT[p.category];
  return (
    <article className="max-w-3xl mx-auto space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-3.5 w-3.5"/> الرئيسية
      </Link>
      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold"
        style={{ background: `color-mix(in oklab, ${cat.c} 20%, transparent)`, color: cat.c, border: `1px solid color-mix(in oklab, ${cat.c} 40%, transparent)` }}>
        {cat.l}
      </span>
      {edit ? (
        <div className="space-y-3">
          <input value={eTitle} onChange={e=>setETitle(e.target.value)} maxLength={200}
            className="glass-input rounded-xl px-3 py-2.5 text-lg font-bold w-full outline-none"/>
          <RichEditor value={eContent} onChange={setEContent} placeholder="عدّل المحتوى…"/>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy}
              className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-primary text-primary-foreground inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
              <Save className="h-4 w-4"/> {busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}
            </button>
            <button onClick={()=>setEdit(false)} disabled={busy}
              className="px-4 rounded-xl text-sm font-bold glass inline-flex items-center gap-1.5">
              <X className="h-4 w-4"/> إلغاء
            </button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-black text-gradient-emerald">{p.title}</h1>
          <div className="text-xs text-muted-foreground">
            {p.author_name ?? "—"} · {new Date(p.created_at).toLocaleDateString("ar")}
            {p.updated_at && p.updated_at !== p.created_at && (
              <span className="mr-2">· عُدِّل في {new Date(p.updated_at).toLocaleDateString("ar")}</span>
            )}
          </div>
          <div className="glass rounded-3xl p-6">
            <RichContent html={p.content}/>
          </div>
          {isStaff && (
            <div className="flex gap-3 text-xs">
              <button onClick={startEdit} className="text-primary hover:underline inline-flex items-center gap-1">
                <Pencil className="h-3.5 w-3.5"/> تعديل
              </button>
              <button onClick={del} className="text-destructive hover:underline inline-flex items-center gap-1">
                <Trash2 className="h-3.5 w-3.5"/> حذف
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
