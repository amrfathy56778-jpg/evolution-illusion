import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSiteLang } from "@/components/AISearchDialog";

export function RephraseButton({ html, onRephrased, color }: { html: string; onRephrased: (newHtml: string) => void; color?: string }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const plain = html.replace(/<[^>]+>/g, "").trim();
    if (plain.length < 30) { toast.error("اكتب محتوى أطول لإعادة الصياغة"); return; }
    if (!confirm("سيُعاد صياغة المقال بواسطة الذكاء الاصطناعي مع الحفاظ على الصور والروابط. هل تريد المتابعة؟")) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("rephrase-article", { body: { html, lang: getSiteLang() } });
      if (error) throw error;
      const newHtml = (data as any)?.html?.trim();
      if (!newHtml) throw new Error("لم يُرجع نصاً");
      onRephrased(newHtml);
      toast.success("تمت إعادة الصياغة ✓");
    } catch (err: any) {
      toast.error("تعذّرت إعادة الصياغة: " + (err?.message ?? err));
    } finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={run} disabled={busy}
      title="إعادة صياغة المقال بالذكاء الاصطناعي"
      className="glass-input rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-50"
      style={color ? { color } : undefined}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Wand2 className="h-3.5 w-3.5"/>}
      {busy ? "جارٍ الصياغة…" : "إعادة صياغة بالذكاء"}
    </button>
  );
}