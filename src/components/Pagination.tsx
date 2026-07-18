import { ChevronRight, ChevronLeft } from "lucide-react";

/** Shared pagination — windowed numeric buttons + prev/next. */
export function Pagination({ page, total, pageSize, onChange, scrollAnchor = "posts-list" }:
  { page: number; total: number; pageSize: number; onChange: (p: number) => void; scrollAnchor?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const go = (p: number) => {
    onChange(Math.max(0, Math.min(pages - 1, p)));
    setTimeout(() => {
      const el = document.getElementById(scrollAnchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const start = Math.max(0, Math.min(page - 2, pages - 5));
  const end = Math.min(pages, start + 5);
  const nums = Array.from({ length: end - start }, (_, i) => start + i);
  return (
    <div className="flex items-center justify-center gap-1.5 pt-4 flex-wrap">
      <button onClick={() => go(page - 1)} disabled={page === 0}
        className="liquid-glass h-9 w-9 rounded-full grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      {nums.map(n => (
        <button key={n} onClick={() => go(n)}
          aria-current={n === page ? "page" : undefined}
          className={`liquid-glass h-9 w-9 rounded-full grid place-items-center text-xs font-bold leading-none ${n === page ? "pagination-active" : ""}`}>
          <span className="block">{n + 1}</span>
        </button>
      ))}
      <button onClick={() => go(page + 1)} disabled={page >= pages - 1}
        className="liquid-glass h-9 w-9 rounded-full grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="text-[10px] text-muted-foreground basis-full text-center">صفحة {page + 1} من {pages}</span>
    </div>
  );
}