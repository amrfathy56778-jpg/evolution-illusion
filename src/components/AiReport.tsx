import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

type Ref = { n: number; id: string; title: string };

export function AiReport({ report, refs }: { report: string; refs: Ref[] }) {
  if (!report) return null;
  const map = new Map(refs.map((r) => [r.n, r] as const));

  // Split text by [#N] tokens and replace with links
  const parts = report.split(/(\[#\d+\])/g);

  return (
    <div className="glass rounded-3xl p-5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--c-guest)" }}>
        <ShieldCheck className="h-3.5 w-3.5"/> تقرير المحكّم الذكي
      </div>
      <div className="prose-content text-sm leading-loose whitespace-pre-wrap">
        {parts.map((p, i) => {
          const m = p.match(/^\[#(\d+)\]$/);
          if (m) {
            const n = Number(m[1]);
            const r = map.get(n);
            if (r) {
              return (
                <Link key={i} to="/post/$id" params={{ id: r.id }}
                  className="inline-flex items-center align-middle px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition"
                  title={r.title}>
                  #{n}
                </Link>
              );
            }
            return <span key={i} className="opacity-60">[#{n}]</span>;
          }
          return <span key={i}>{p}</span>;
        })}
      </div>
    </div>
  );
}