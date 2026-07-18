import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Palette, X, Sparkles, Check, Trash2, Loader2, Eye, EyeOff, Wand2, Layers } from "lucide-react";
import {
  PRESETS, STYLES, setThemePreset, setCustomTheme, getThemeId, getFxOff, setFxOff,
  applyVariant, setDesignStyle, getDesignStyle, type ThemeVariant, type ThemeTokens,
} from "@/lib/appearance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type SavedRow = { id: string; name: string; tokens: any };
type SavedTheme = { id: string; name: string; variant: ThemeVariant };

// Normalize saved DB rows (old shape { ...tokens } / { tokens } / new shape { dark, light })
function normalize(row: SavedRow): SavedTheme {
  const t = row.tokens ?? {};
  if (t.dark && t.light) return { id: row.id, name: row.name, variant: { dark: t.dark, light: t.light } };
  const asTokens = t as ThemeTokens;
  return { id: row.id, name: row.name, variant: { dark: asTokens, light: asTokens } };
}

export default function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} title="المظهر" aria-label="المظهر"
        className="liquid-glass inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold">
        <Palette className="h-3.5 w-3.5"/>
        <span className="hidden sm:inline">المظهر</span>
      </button>
      {open && <AppearanceDialog onClose={() => setOpen(false)}/>}
    </>
  );
}

function AppearanceDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [themeId, setThemeIdState] = useState<string>(getThemeId());
  const [styleId, setStyleIdState] = useState<string>(getDesignStyle());
  const [fxOff, setFxOffState] = useState<boolean>(getFxOff());
  const [saved, setSaved] = useState<SavedTheme[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_themes").select("id, name, tokens").order("created_at", { ascending: false }).then(({ data }) => {
      setSaved(((data ?? []) as unknown as SavedRow[]).map(normalize));
    });
  }, [user]);

  const pickPreset = (id: string) => { setThemePreset(id); setThemeIdState(id); };
  const pickSaved = (t: SavedTheme) => { setCustomTheme(t.variant); setThemeIdState("custom"); };
  const pickStyle = (id: string) => { setDesignStyle(id); setStyleIdState(id); };
  const toggleFx = () => { const v = !fxOff; setFxOff(v); setFxOffState(v); };

  const generate = async () => {
    if (!prompt.trim() || generating) return;
    if (!user) { toast.error("سجّل الدخول أولاً لحفظ التصميم"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-theme", { body: { prompt } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Accept new shape { name, dark, light } or legacy { name, tokens }
      const dark = data.dark ?? data.tokens;
      const light = data.light ?? data.tokens ?? dark;
      if (!dark) throw new Error("استجابة غير مكتملة");
      const variant: ThemeVariant = { dark, light };
      const name = String(data.name ?? "تصميم مخصّص").slice(0, 60);
      applyVariant(variant);
      const { data: row, error: insErr } = await supabase.from("user_themes")
        .insert([{ user_id: user.id, name, tokens: variant as unknown as any }])
        .select("id, name, tokens").single();
      if (insErr) throw insErr;
      setSaved(s => [normalize(row as SavedRow), ...s]);
      setCustomTheme(variant);
      setThemeIdState("custom");
      setPrompt("");
      toast.success("تم إنشاء التصميم وحفظه");
    } catch (e) {
      toast.error("تعذّر التوليد: " + ((e as Error)?.message ?? "خطأ"));
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_themes").delete().eq("id", id);
    if (error) { toast.error("تعذّر الحذف"); return; }
    setSaved(s => s.filter(t => t.id !== id));
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-pop-in"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-lg glass-strong rounded-3xl shadow-2xl border border-white/10 flex flex-col"
        style={{ maxHeight: "88vh" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Palette className="h-4 w-4 text-primary"/> المظهر
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X className="h-3.5 w-3.5"/></button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
          {/* Effects toggle */}
          <button onClick={toggleFx}
            className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition text-right">
            <div className="flex items-center gap-2">
              {fxOff ? <EyeOff className="h-4 w-4 text-muted-foreground"/> : <Eye className="h-4 w-4 text-primary"/>}
              <div className="flex flex-col">
                <span className="text-sm font-bold">{fxOff ? "المؤثرات البصرية مُعطّلة" : "المؤثرات البصرية مُفعّلة"}</span>
                <span className="text-[11px] text-muted-foreground">التمويه (Blur) والإضاءات والتدرجات</span>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${fxOff ? "bg-white/10" : "bg-primary/20 text-primary"}`}>
              {fxOff ? "إيقاف" : "تشغيل"}
            </span>
          </button>

          {/* Full Site Designs */}
          <div>
            <h3 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5"/> تصاميم كاملة للموقع
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(s => {
                const active = styleId === s.id;
                return (
                  <button key={s.id} onClick={() => pickStyle(s.id)}
                    className={`p-2.5 rounded-2xl border transition text-right ${active ? "border-primary bg-primary/10" : "border-white/10 hover:bg-white/10"}`}>
                    <div className={`h-10 rounded-xl mb-2 style-preview style-preview-${s.id}`} aria-hidden />
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{s.name}</span>
                      {active && <Check className="h-3.5 w-3.5 text-primary"/>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <h3 className="text-xs font-bold text-primary mb-2">لوحات ألوان جاهزة</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => {
                const active = themeId === p.id;
                const t = p.dark;
                return (
                  <button key={p.id} onClick={() => pickPreset(p.id)}
                    className={`p-2.5 rounded-2xl border transition text-right ${active ? "border-primary bg-primary/10" : "border-white/10 hover:bg-white/10"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full border border-white/20" style={{ background: t.primary }}/>
                      <span className="h-6 w-6 rounded-full border border-white/20" style={{ background: t.accent }}/>
                      <span className="h-6 w-6 rounded-full border border-white/20" style={{ background: t.background }}/>
                      {active && <Check className="h-3.5 w-3.5 text-primary ms-auto"/>}
                    </div>
                    <div className="text-xs font-bold">{p.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User saved */}
          {user && saved.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-primary mb-2">تصاميمك المحفوظة</h3>
              <div className="grid grid-cols-1 gap-2">
                {saved.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-white/10">
                    <button onClick={() => pickSaved(t)} className="flex-1 flex items-center gap-2 text-right hover:opacity-80">
                      <span className="h-6 w-6 rounded-full border border-white/20" style={{ background: t.variant.dark.primary }}/>
                      <span className="h-6 w-6 rounded-full border border-white/20" style={{ background: t.variant.dark.accent }}/>
                      <span className="text-xs font-bold flex-1">{t.name}</span>
                    </button>
                    <button onClick={() => remove(t.id)} className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive">
                      <Trash2 className="h-3.5 w-3.5"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI generator */}
          <div>
            <h3 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5"/> إنشاء تصميم بالذكاء الاصطناعي
            </h3>
            {!user ? (
              <p className="text-xs text-muted-foreground p-3 rounded-xl bg-white/5 border border-white/10">
                سجّل الدخول لحفظ تصاميمك الخاصّة.
              </p>
            ) : (
              <div className="space-y-2">
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="مثال: تصميم شبيه بأعماق الأرض بألوان دافئة ذهبية"
                  rows={3}
                  className="w-full glass-input rounded-xl p-2.5 text-xs resize-none focus:outline-none"/>
                <button onClick={generate} disabled={generating || !prompt.trim()}
                  className="w-full liquid-glass inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                  style={{ background: "color-mix(in oklab, var(--primary) 20%, transparent)", color: "var(--primary)" }}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Wand2 className="h-3.5 w-3.5"/>}
                  {generating ? "جارِ التوليد…" : "أنشئ التصميم"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
