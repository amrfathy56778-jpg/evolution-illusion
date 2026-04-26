import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-chat`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function PostAIButton({ post, compact = false }: { post: { id: string; title: string; content: string }; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1.5 rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary font-bold transition ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"}`}
        title="ملخص الذكاء الاصطناعي ونقاش حول المقال"
      >
        <Sparkles className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        ملخّص ونقاش
      </button>
      {open && <PostAIDialog post={post} onClose={() => setOpen(false)} />}
    </>
  );
}

function PostAIDialog({ post, onClose }: { post: { id: string; title: string; content: string }; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const stream = async (mode: "summarize" | "chat", history: Msg[]) => {
    setLoading(true);
    let acc = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    try {
      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ article: { title: post.title, content: post.content }, mode, messages: history }),
      });
      if (resp.status === 429) { toast.error("الحد الأقصى من الطلبات تم تجاوزه. حاول لاحقاً."); throw new Error("429"); }
      if (resp.status === 402) { toast.error("نفد الرصيد، يرجى إضافة رصيد للمساحة."); throw new Error("402"); }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1 || prev[i].content));
    } finally {
      setLoading(false);
    }
  };

  const summarize = () => { if (loading) return; setMessages([{ role: "user", content: "لخّص المقال" }]); stream("summarize", []); };
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    stream("chat", next);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl glass-strong rounded-3xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-bold text-sm truncate">ملخّص ونقاش: {post.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
          {messages.length === 0 ? (
            <div className="text-center space-y-3 py-8">
              <p className="text-xs text-muted-foreground">اطلب ملخّصاً سريعاً أو اطرح سؤالاً حول المقال</p>
              <button onClick={summarize} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-bold hover:opacity-90">
                <BookOpenCheck className="h-4 w-4" /> لخّص لي المقال
              </button>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary/20 border border-primary/40" : "glass"
              }`}>
                {m.content || (loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null)}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={send} className="p-3 border-t border-white/10 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
            placeholder="اطرح سؤالاً حول المقال…" maxLength={500}
            className="flex-1 glass-input rounded-full px-4 py-2 text-sm outline-none" />
          <button type="submit" disabled={loading || !input.trim()}
            className="rounded-full bg-primary text-primary-foreground px-4 disabled:opacity-50 grid place-items-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}