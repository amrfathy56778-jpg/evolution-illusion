import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, ArrowRight } from "lucide-react";

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
      <h1 className="text-3xl font-black text-gradient-emerald">{p.title}</h1>
      <div className="text-xs text-muted-foreground">
        {p.author_name ?? "—"} · {new Date(p.created_at).toLocaleDateString("ar")}
      </div>
      <div className="glass rounded-3xl p-6 text-sm leading-loose whitespace-pre-wrap">{p.content}</div>
      {isStaff && (
        <button onClick={del} className="text-xs text-destructive hover:underline inline-flex items-center gap-1">
          <Trash2 className="h-3.5 w-3.5"/> حذف
        </button>
      )}
    </article>
  );
}
