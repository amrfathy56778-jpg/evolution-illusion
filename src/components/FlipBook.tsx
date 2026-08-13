import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, BookOpen, AlignJustify } from "lucide-react";
import { RichContent } from "@/components/RichEditor";

/** Count <img> tags inside stored article HTML. */
export function countImages(html: string): number {
  return (html.match(/<img\b/gi) ?? []).length;
}

/**
 * Split article HTML into "pages": every image starts a new page and keeps the
 * text that follows it. Any leading text before the first image becomes page 1.
 */
function splitPages(html: string): string[] {
  if (typeof window === "undefined") return [html];
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return [html];
  const pages: string[] = [];
  let buf = "";
  const flush = () => { if (buf.replace(/<[^>]+>/g, "").trim() || /<(img|video|iframe)\b/i.test(buf)) pages.push(buf); buf = ""; };
  for (const node of Array.from(root.childNodes)) {
    const el = node as HTMLElement;
    const isMedia = el.nodeType === 1 && (
      /^(IMG|VIDEO|IFRAME|FIGURE)$/.test(el.tagName) ||
      !!el.querySelector?.("img, video, iframe")
    );
    if (isMedia) { flush(); pages.push(el.outerHTML ?? ""); continue; }
    buf += el.nodeType === 1 ? (el.outerHTML ?? "") : (el.textContent ?? "");
  }
  flush();
  return pages.length ? pages : [html];
}

export function FlipBook({ html, title }: { html: string; title?: string }) {
  const pages = useMemo(() => splitPages(html), [html]);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [plain, setPlain] = useState(false);

  const go = (n: number) => {
    if (n < 0 || n >= pages.length || n === i) return;
    setDir(n > i ? "next" : "prev");
    setI(n);
  };

  useEffect(() => {
    if (plain) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(i + 1);
      if (e.key === "ArrowRight") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, plain, pages.length]);

  if (plain) {
    return (
      <div className="space-y-3">
        <button onClick={() => setPlain(false)}
          className="glass rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white/10">
          <BookOpen className="h-3.5 w-3.5"/> عرض ككتاب
        </button>
        <div className="glass rounded-3xl p-5 sm:p-7"><RichContent html={html}/></div>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5"/> عرض ككتاب · صفحة {i + 1} من {pages.length}
        </span>
        <button onClick={() => setPlain(true)}
          className="glass rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white/10">
          <AlignJustify className="h-3.5 w-3.5"/> عرض عادي
        </button>
      </div>

      <div className="relative glass rounded-3xl overflow-hidden">
        <div key={i} className={`flipbook-page p-4 sm:p-7 min-h-[52vh] flex flex-col justify-center ${dir === "next" ? "flip-next" : "flip-prev"}`}>
          <RichContent html={pages[i]}/>
        </div>
        <div className="pointer-events-none absolute inset-y-0 start-0 w-6 bg-gradient-to-l from-black/15 to-transparent"/>
        <div className="absolute bottom-2 inset-x-0 text-center text-[10px] text-muted-foreground">
          {title ? `${title} — ` : ""}{i + 1}/{pages.length}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button onClick={() => go(i - 1)} disabled={i === 0}
          className="glass rounded-full p-2 disabled:opacity-30 hover:bg-white/10" aria-label="الصفحة السابقة">
          <ChevronRight className="h-4 w-4"/>
        </button>
        <div className="flex items-center gap-1 flex-wrap justify-center max-w-[70vw]">
          {pages.map((_, n) => (
            <button key={n} onClick={() => go(n)}
              className={`min-w-7 h-7 px-2 rounded-full text-xs font-bold transition ${
                n === i ? "bg-primary text-primary-foreground page-num-active" : "glass hover:bg-white/10"}`}>
              {n + 1}
            </button>
          ))}
        </div>
        <button onClick={() => go(i + 1)} disabled={i === pages.length - 1}
          className="glass rounded-full p-2 disabled:opacity-30 hover:bg-white/10" aria-label="الصفحة التالية">
          <ChevronLeft className="h-4 w-4"/>
        </button>
      </div>
    </div>
  );
}