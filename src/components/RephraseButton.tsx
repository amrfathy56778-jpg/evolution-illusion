import { useRef, useState } from "react";
import { Wand2, Loader2, RotateCcw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSiteLang } from "@/lib/lang";

/**
 * Rephrase control with in-place toggle:
 * - Click "إعادة صياغة" → AI rephrases and swaps the editor content.
 * - A toggle then lets the user flip back to the original (and back again).
 * - The currently-displayed version is whatever stays in the editor on close.
 */
export function RephraseButton({ html, onRephrased, color }:
  { html: string; onRephrased: (newHtml: string) => void; color?: string }) {
  const [busy, setBusy] = useState(false);
  const originalRef = useRef<string | null>(null);
  const rephrasedRef = useRef<string | null>(null);
  const [showingRephrased, setShowingRephrased] = useState(false);

  const run = async () => {
    const plain = html.replace(/<[^>]+>/g, "").trim();
    if (plain.length < 30) { toast.error("اكتب محتوى أطول لإعادة الصياغة"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("rephrase-article", {
        body: { html, lang: getSiteLang() },
      });
      if (error) throw error;
      const newHtml = (data as any)?.html?.trim();
      if (!newHtml) throw new Error("لم يُرجع نصاً");
      originalRef.current = html;
      rephrasedRef.current = newHtml;
      setShowingRephrased(true);
      onRephrased(newHtml);
      toast.success("تمت إعادة الصياغة — اضغط (إظهار الأصلي) للمقارنة");
    } catch (err: any) {
      toast.error("تعذّرت إعادة الصياغة: " + (err?.message ?? err));
    } finally { setBusy(false); }
  };

  const toggle = () => {
    if (!originalRef.current || !rephrasedRef.current) return;
    if (showingRephrased) {
      onRephrased(originalRef.current);
      setShowingRephrased(false);
    } else {
      onRephrased(rephrasedRef.current);
      setShowingRephrased(true);
    }
  };

  const hasAlt = originalRef.current !== null && rephrasedRef.current !== null;

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <button type="button" onClick={run} disabled={busy}
        title="إعادة صياغة المقال بالذكاء الاصطناعي"
        className="glass-input rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-50"
        style={color ? { color } : undefined}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
        {busy ? "جارٍ الصياغة…" : hasAlt ? "إعادة صياغة جديدة" : "إعادة صياغة بالذكاء"}
      </button>
      {hasAlt && (
        <button type="button" onClick={toggle}
          title={showingRephrased ? "عرض النص الأصلي" : "عرض النص المُعاد صياغته"}
          className="glass-input rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white/10">
          {showingRephrased ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showingRephrased ? "إظهار الأصلي" : "إظهار المُعاد صياغته"}
        </button>
      )}
      {hasAlt && showingRephrased && (
        <button type="button" onClick={() => { onRephrased(originalRef.current!); originalRef.current = null; rephrasedRef.current = null; setShowingRephrased(false); }}
          title="تجاهل الصياغة والعودة للأصل" className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
          <RotateCcw className="h-3 w-3" /> تجاهل
        </button>
      )}
      {hasAlt && (
        <span className="text-[10px] px-2 py-1 rounded-full"
          style={{ background: "color-mix(in oklab, var(--primary) 20%, transparent)", color: "var(--primary)" }}>
          {showingRephrased ? "النص المُعاد صياغته" : "النص الأصلي"}
        </span>
      )}
    </div>
  );
}