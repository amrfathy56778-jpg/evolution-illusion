import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type PostRef = { id: string; title: string };

const norm = (s: string) =>
  s.replace(/[\u064B-\u065F\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

let cache: PostRef[] | null = null;

/** كل عناوين مقالات الموقع (تُحمَّل مرة واحدة) لربط استشهادات الذكاء الاصطناعي. */
export function usePostIndex(): PostRef[] {
  const [posts, setPosts] = useState<PostRef[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    supabase
      .from("posts")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        cache = (data ?? []) as PostRef[];
        if (alive) setPosts(cache);
      });
    return () => { alive = false; };
  }, []);
  return posts;
}

export function findPost(title: string, index: PostRef[]): PostRef | undefined {
  const t = norm(title);
  if (!t) return undefined;
  return (
    index.find((p) => norm(p.title) === t) ??
    index.find((p) => norm(p.title).includes(t) || t.includes(norm(p.title)))
  );
}

const TOKEN = /\[(?:مقال|Article|article)\s*:\s*([^\]]+)\]/g;

/** يحوّل [مقال: العنوان] إلى روابط ماركداون مباشرة. */
export function toMarkdownLinks(text: string, index: PostRef[]): string {
  if (!text) return text;
  return text.replace(TOKEN, (m, title: string) => {
    const p = findPost(title, index);
    return p ? `[${p.title}](/post/${p.id})` : title.trim();
  });
}

/** يحوّل [مقال: العنوان] إلى عناصر Link داخل نص عادي. */
export function linkifyAi(text: string, index: PostRef[]): ReactNode[] {
  if (!text) return [text];
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const p = findPost(m[1], index);
    out.push(
      p ? (
        <Link key={`${m.index}`} to="/post/$id" params={{ id: p.id }}
          className="font-bold text-primary underline decoration-primary/50 hover:decoration-primary">
          {p.title}
        </Link>
      ) : (
        <span key={`${m.index}`} className="font-bold">{m[1].trim()}</span>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
