import { useEditor, EditorContent, Node, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Youtube from "@tiptap/extension-youtube";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { Plugin } from "@tiptap/pm/state";
import {
  Bold, Italic, Underline as UnderIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Image as ImageIcon, Youtube as YtIcon,
  AlignRight, AlignCenter, AlignLeft, Undo2, Redo2, Minus, Palette,
  Video, Upload, Minimize2, Type, ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadToBucket } from "@/lib/upload";
import { toast } from "sonner";

// Resizable image: stores width as percentage so it survives serialization
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: el => el.getAttribute("width"), renderHTML: a => a.width ? { width: a.width } : {} },
    };
  },
});

// Minimal inline-video node so tiptap preserves <video controls src="...">
const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      width: { default: null, parseHTML: el => el.getAttribute("width"), renderHTML: a => a.width ? { width: a.width } : {} },
    };
  },
  parseHTML() { return [{ tag: "video" }]; },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["video", { controls: "true", class: "rounded-xl my-3 mx-auto max-w-full", ...HTMLAttributes }];
  },
});

const COLORS = ["#ffffff", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f87171", "#94a3b8"];

function Btn({ onClick, active, disabled, title, children }:
  { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className={`p-1.5 rounded-md text-xs transition disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? "bg-primary/30 text-primary" : "hover:bg-white/10 text-foreground/80"}`}>
      {children}
    </button>
  );
}

/** Small grouped dropdown — plain absolute positioning, no floating-ui instances. */
function Group({ label, icon, open, onToggle, children }:
  { label: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle}
        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition
          ${open ? "bg-primary/25 text-primary" : "hover:bg-white/10 text-foreground/80"}`}>
        {icon}<span className="hidden sm:inline">{label}</span>
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && <div className="rt-pop" dir="rtl">{children}</div>}
    </div>
  );
}

/** Shared media/link helpers for an editor instance. */
function useMedia(editor: Editor) {
  const insertImage = useCallback((url: string) => {
    editor.chain().focus().setImage({ src: url }).createParagraphNear().run();
  }, [editor]);

  const insertVideo = useCallback((url: string) => {
    editor.chain().focus()
      .insertContent(`<video src="${url}" controls class="rounded-xl my-3 mx-auto max-w-full"></video><p></p>`).run();
  }, [editor]);

  const pickImages = useCallback(async (files: File[]) => {
    const ok = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (ok.length < files.length) toast.error("تم تجاهل صور تجاوزت 10MB");
    if (ok.length > 1) toast.info(`جارٍ رفع ${ok.length} صور…`);
    for (const f of ok) {
      try { insertImage(await uploadToBucket(f)); }
      catch (err: any) { toast.error("تعذّر رفع الصورة: " + err.message); }
    }
    if (ok.length > 1) toast.success("تم رفع جميع الصور");
  }, [insertImage]);

  const pickVideo = useCallback(async (f: File) => {
    if (f.size > 25 * 1024 * 1024) { toast.error("حجم الفيديو الأقصى 25MB"); return; }
    try { insertVideo(await uploadToBucket(f)); }
    catch (err: any) { toast.error("تعذّر رفع الفيديو: " + err.message); }
  }, [insertVideo]);

  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("أدخل الرابط (اتركه فارغاً للإزالة):", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  }, [editor]);

  const addImageUrl = useCallback(() => {
    const url = window.prompt("رابط الصورة:");
    if (url) insertImage(url);
  }, [insertImage, editor]);

  const addVideoUrl = useCallback(() => {
    const url = window.prompt("رابط فيديو (mp4):");
    if (url) insertVideo(url);
  }, [insertVideo]);

  const addYoutube = useCallback(() => {
    const url = window.prompt("رابط فيديو يوتيوب:");
    if (url) editor.commands.setYoutubeVideo({ src: url, width: 560, height: 315 });
  }, [editor]);

  const setMediaWidth = useCallback((w: string | null) => {
    if (editor.isActive("image")) editor.chain().focus().updateAttributes("image", { width: w }).run();
    else if (editor.isActive("video")) editor.chain().focus().updateAttributes("video", { width: w }).run();
  }, [editor]);

  return { pickImages, pickVideo, setLink, addImageUrl, addVideoUrl, addYoutube, setMediaWidth };
}

/** Single compact toolbar: essentials inline + one text-formatting dropdown. */
function Toolbar({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState<null | "text">(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as any)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const toggle = () => setOpen(prev => (prev === "text" ? null : "text"));

  return (
    <div ref={wrapRef} dir="rtl"
      className="sticky top-0 z-20 flex items-center gap-1 p-2 border-b border-white/10 bg-background/90 backdrop-blur-md rounded-t-xl">
      <Btn title="عريض" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4"/></Btn>
      <Btn title="مائل" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4"/></Btn>
      <Btn title="تحته خط" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderIcon className="h-4 w-4"/></Btn>

      <Group label="نص" icon={<Type className="h-3.5 w-3.5"/>} open={open === "text"} onToggle={toggle}>
        <Btn title="عنوان كبير" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4"/></Btn>
        <Btn title="عنوان متوسط" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4"/></Btn>
        <Btn title="عنوان صغير" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4"/></Btn>
        <Btn title="مشطوب" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4"/></Btn>
        <Btn title="قائمة نقطية" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4"/></Btn>
        <Btn title="قائمة مرقمة" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4"/></Btn>
        <Btn title="اقتباس" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4"/></Btn>
        <Btn title="محاذاة يمين" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4"/></Btn>
        <Btn title="توسيط" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4"/></Btn>
        <Btn title="محاذاة يسار" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4"/></Btn>
        <Btn title="فاصل أفقي" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4"/></Btn>
        <div className="flex items-center gap-1 w-full pt-1 border-t border-white/10 mt-1">
          <Palette className="h-3.5 w-3.5 text-muted-foreground"/>
          {COLORS.map(c => (
            <button key={c} type="button" title={c} onClick={() => editor.chain().focus().setColor(c).run()}
              className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition" style={{ background: c }}/>
          ))}
          <button type="button" title="إزالة اللون" onClick={() => editor.chain().focus().unsetColor().run()}
            className="text-[10px] px-1 text-muted-foreground hover:text-foreground">×</button>
        </div>
      </Group>


      <div className="ms-auto flex items-center gap-1">
        <Btn title="تراجع" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4"/></Btn>
        <Btn title="إعادة" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4"/></Btn>
      </div>

    </div>
  );
}

/** One contextual bubble: formatting for text selection, size slider for media. */
function ContextBubble({ editor }: { editor: Editor }) {
  const m = useMedia(editor);
  const isMedia = editor.isActive("image") || editor.isActive("video");
  // Local slider state + rAF-throttled commit: writing the width attribute on
  // every pointer move re-serializes the whole document and made zooming lag.
  const attrW = isMedia
    ? ((editor.getAttributes(editor.isActive("image") ? "image" : "video")?.width as string | null) ?? "")
    : "";
  const parsed = (() => { const mm = /^(\d+)%$/.exec(attrW ?? ""); return mm ? Number(mm[1]) : 100; })();
  const [size, setSize] = useState<number>(parsed);
  const rafRef = useRef<number | null>(null);
  useEffect(() => { setSize(parsed); }, [parsed, isMedia]);
  const onSlide = (v: number) => {
    setSize(v);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; m.setMediaWidth(`${v}%`); });
  };
  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 44 }}
      shouldShow={({ editor, from, to }) =>
        editor.isEditable && (editor.isActive("image") || editor.isActive("video") || from !== to)}
    >
      <div dir="rtl" style={{ zIndex: 2147483647, position: "relative" }}
        className="flex items-center gap-1 p-1.5 rounded-2xl border border-white/20 bg-background/95 backdrop-blur-md shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)] max-w-[92vw]">
        {isMedia ? (
          <>
            <span className="text-[10px] text-muted-foreground px-1 shrink-0">الحجم</span>
            <input type="range" min={10} max={100} step={1}
              value={size}
              onChange={e => onSlide(Number(e.target.value))}
              className="accent-primary w-36 max-w-[42vw]"/>
            <Btn title="الحجم الأصلي" onClick={() => { setSize(100); m.setMediaWidth(null); }}><Minimize2 className="h-4 w-4"/></Btn>
          </>
        ) : (
          <>
            <Btn title="عريض" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4"/></Btn>
            <Btn title="مائل" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4"/></Btn>
            <Btn title="تحته خط" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderIcon className="h-4 w-4"/></Btn>
            <Btn title="عنوان" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4"/></Btn>
            <Btn title="اقتباس" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4"/></Btn>
            <Btn title="رابط" active={editor.isActive("link")} onClick={m.setLink}><Link2 className="h-4 w-4"/></Btn>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}

/** Menu shown at the start of an empty line: quick media / link insertion. */
function LineStartMenu({ editor }: { editor: Editor }) {
  const m = useMedia(editor);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  return (
    <FloatingMenu editor={editor} options={{ placement: "right", offset: 8 }}>
      <div dir="rtl" style={{ zIndex: 2147483646, position: "relative" }}
        className="flex items-center gap-1 p-1 rounded-xl border border-white/20 bg-background/95 backdrop-blur-md shadow-[0_12px_36px_-14px_rgba(0,0,0,0.8)]">
        <Btn title="رفع صور من الجهاز" onClick={() => imgRef.current?.click()}><Upload className="h-4 w-4"/></Btn>
        <Btn title="صورة من رابط" onClick={m.addImageUrl}><ImageIcon className="h-4 w-4"/></Btn>
        <Btn title="رفع فيديو" onClick={() => vidRef.current?.click()}><Video className="h-4 w-4"/></Btn>
        <Btn title="فيديو من رابط" onClick={m.addVideoUrl}><Video className="h-4 w-4 opacity-60"/></Btn>
        <Btn title="فيديو يوتيوب" onClick={m.addYoutube}><YtIcon className="h-4 w-4"/></Btn>
        <Btn title="رابط" onClick={m.setLink}><Link2 className="h-4 w-4"/></Btn>
        <input ref={imgRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; if (fs.length) void m.pickImages(fs); }}/>
        <input ref={vidRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void m.pickVideo(f); }}/>
      </div>
    </FloatingMenu>
  );
}


export function RichEditor({ value, onChange, placeholder }:
  { value: string; onChange: (html: string) => void; placeholder?: string }) {
  // Plugin: intercept pasted/dropped media so files upload to storage instead of blob: URLs
  const PasteUploadPlugin = () =>
    new Plugin({
      props: {
        handlePaste(view, event) {
          const files = Array.from(event.clipboardData?.files ?? []).filter(f => f.type.startsWith("image/"));
          if (files.length === 0) return false;
          event.preventDefault();
          (async () => {
            for (const f of files) {
              if (f.size > 10 * 1024 * 1024) { toast.error("حجم الصورة الأقصى 10MB"); continue; }
              try {
                const url = await uploadToBucket(f);
                const node = view.state.schema.nodes.image.create({ src: url });
                view.dispatch(view.state.tr.replaceSelectionWith(node));
              } catch (err: any) { toast.error("تعذّر رفع الصورة: " + err.message); }
            }
          })();
          return true;
        },
        handleDrop(view, event) {
          const files = Array.from((event as DragEvent).dataTransfer?.files ?? [])
            .filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
          if (files.length === 0) return false;
          event.preventDefault();
          (async () => {
            for (const f of files) {
              const isVideo = f.type.startsWith("video/");
              const max = isVideo ? 25 : 10;
              if (f.size > max * 1024 * 1024) { toast.error(`الحجم الأقصى ${max}MB`); continue; }
              try {
                const url = await uploadToBucket(f);
                if (isVideo) {
                  const node = view.state.schema.nodes.video?.create({ src: url });
                  if (node) view.dispatch(view.state.tr.replaceSelectionWith(node));
                } else {
                  const node = view.state.schema.nodes.image.create({ src: url });
                  view.dispatch(view.state.tr.replaceSelectionWith(node));
                }
              } catch (err: any) { toast.error("تعذّر الرفع: " + err.message); }
            }
          })();
          return true;
        },
      },
    });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline" } }),
      ResizableImage.configure({ HTMLAttributes: { class: "rounded-xl my-3 max-w-full mx-auto" } }),
      TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "right" }),
      Youtube.configure({ controls: true, nocookie: true, HTMLAttributes: { class: "rounded-xl my-3 mx-auto max-w-full" } }),
      VideoNode,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose-content min-h-[280px] p-4 outline-none text-sm leading-loose",
        dir: "rtl",
        "data-placeholder": placeholder ?? "اكتب هنا…",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g. AI rephrase) into the editor.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  // Register paste/drop interceptor once editor is ready
  if (editor && !(editor as any)._pasteUploadRegistered) {
    editor.registerPlugin(PasteUploadPlugin());
    (editor as any)._pasteUploadRegistered = true;
  }

  if (!editor) return <div className="glass-input rounded-xl h-72 animate-pulse"/>;

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-background/40">
      <Toolbar editor={editor}/>
      <ContextBubble editor={editor}/>
      <LineStartMenu editor={editor}/>
      <EditorContent editor={editor}/>


    </div>
  );
}

export function RichContent({ html }: { html: string }) {
  // Detect legacy plain text (no HTML tags) and preserve line breaks
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(html);
  if (!isHtml) {
    return <div className="prose-content text-sm leading-loose whitespace-pre-wrap">{html}</div>;
  }
  // Strip dead blob: image/video sources (they expire after the upload session)
  let cleaned = html
    .replace(/<img[^>]*src=["']blob:[^"']*["'][^>]*>/gi, '<p class="text-xs text-muted-foreground italic">[صورة فُقدت — يرجى من الكاتب إعادة رفعها]</p>')
    .replace(/<video[^>]*src=["']blob:[^"']*["'][^>]*>(.*?<\/video>)?/gi, '<p class="text-xs text-muted-foreground italic">[فيديو فُقد — يرجى من الكاتب إعادة رفعه]</p>')
    // Lazy-load user-content images/videos for faster page loads.
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"')
    .replace(/<video\b(?![^>]*\bpreload=)/gi, '<video preload="metadata"');
  // Route in-article Supabase images through the on-the-fly transformer
  // so old posts with heavy originals load as compact WebP thumbnails.
  cleaned = cleaned.replace(
    /<img\b([^>]*?)\bsrc=(["'])([^"']+)\2/gi,
    (_m, attrs: string, q: string, src: string) => {
      if (!/\/storage\/v1\/object\/public\//.test(src)) return `<img${attrs} src=${q}${src}${q}`;
      if (/\.(gif|svg)(\?|$)/i.test(src)) return `<img${attrs} src=${q}${src}${q}`;
      const rendered = src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
      const sep = rendered.includes("?") ? "&" : "?";
      return `<img${attrs} src=${q}${rendered}${sep}width=900&quality=72&resize=contain${q}`;
    }
  );
  return <div className="prose-content text-sm leading-loose" dangerouslySetInnerHTML={{ __html: cleaned }}/>;
}