import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { getSiteLang } from "@/components/AISearchDialog";
import { cleanAiText } from "@/lib/aiText";
import { usePostIndex, toMarkdownLinks } from "@/lib/aiLinks";

export const Route = createFileRoute("/_app/critic")({
  component: CriticPage,
  head: () => ({
    meta: [
      { title: "ناقد التطور الذكي · وهم التطور" },
      { name: "description", content: "أداة ذكاء اصطناعي متخصصة لنقد التطور علمياً." },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-critic`;

function CriticPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const postIndex = usePostIndex();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);

  // Pin the latest message to the top of the chat container when it appears,
  // instead of continuously scrolling while tokens stream.
  useEffect(() => {
    if (messages.length === 0) return;
    const c = scrollRef.current;
    const el = lastMsgRef.current;
    if (!c || !el) return;
    c.scrollTo({ top: el.offsetTop - c.offsetTop, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
      // No auto-scroll while streaming — message stays pinned at the top.
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), lang: getSiteLang() }),
      });
      if (resp.status === 429) { toast.error("تم تجاوز الحد. حاول لاحقاً."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("نفد رصيد الذكاء الاصطناعي."); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: rdone, value } = await reader.read();
        if (rdone) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || !line.trim()) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf; break;
          }
        }
      }
    } catch (e: any) {
      toast.error("فشل الاتصال بالذكاء الاصطناعي");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto notranslate" translate="no">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold" style={{ color: "var(--c-critic)" }}>
          <span className="font-black tracking-wider">AI</span> نقد علمي فوري
        </div>
        <h1 className="text-3xl font-black text-gradient-emerald">ناقد التطور الذكي</h1>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          اطرح ادعاءً تطورياً وسيُفنّده الذكاء الاصطناعي بحدّة علمية ووضوح
        </p>
      </div>

      <div ref={scrollRef} className="glass rounded-3xl p-4 sm:p-6 min-h-[400px] max-h-[60vh] overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            <div className="mx-auto mb-3 opacity-60 grid place-items-center h-12 w-12 rounded-full border border-current font-black text-base tracking-widest" style={{ color: "var(--c-critic)" }}>AI</div>
            ابدأ بسؤال مثل: <em>"هل تؤدي الطفرات للتطور؟"</em>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}
               ref={i === messages.length - 1 ? lastMsgRef : undefined}
               className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${m.role === "user" ? "glass-input" : "glass-strong"}`}
                 style={m.role === "assistant" ? { borderColor: "color-mix(in oklab, var(--c-critic) 40%, transparent)" } : undefined}>
              {m.role === "assistant" && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold mb-2" style={{ color: "var(--c-critic)" }}>
                  <span className="font-black tracking-wider">AI</span> ناقد التطور
                </div>
              )}
              <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) =>
                      href?.startsWith("/post/") ? (
                        <Link to="/post/$id" params={{ id: href.replace("/post/", "") }}
                          className="font-bold text-primary underline decoration-primary/50">
                          {children}
                        </Link>
                      ) : (
                        <a href={href} target="_blank" rel="noreferrer">{children}</a>
                      ),
                  }}
                >
                  {toMarkdownLinks(cleanAiText(m.content), postIndex)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-end">
            <div className="glass-strong rounded-2xl p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> جارٍ التفكير…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e)=>{e.preventDefault(); send();}} className="glass-input rounded-2xl p-2 flex gap-2">
        <input
          value={input} onChange={(e)=>setInput(e.target.value)} disabled={loading}
          placeholder="اطرح سؤالك أو ادعاءً تطورياً للنقد…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button type="submit" disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 hover:opacity-90 flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" /> إرسال
        </button>
      </form>
    </div>
  );
}
