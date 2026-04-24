import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold, Italic, Underline as UnderIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link2, Link2Off, Image as ImageIcon, Youtube as YtIcon,
  AlignRight, AlignCenter, AlignLeft, AlignJustify, Undo2, Redo2, Minus, Palette,
} from "lucide-react";
import { useRef } from "react";

const COLORS = [
  "#ffffff", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f87171", "#94a3b8",
];

function Btn({ onClick, active, disabled, title, children }:
  { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 rounded-md text-xs transition disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? "bg-primary/30 text-primary" : "hover:bg-white/10 text-foreground/80"}`}>
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("أدخل الرابط (اتركه فارغاً للإزالة):", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  };

  const addImageUrl = () => {
    const url = window.prompt("رابط الصورة:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addYoutube = () => {
    const url = window.prompt("رابط فيديو يوتيوب:");
    if (url) editor.commands.setYoutubeVideo({ src: url, width: 560, height: 315 });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert("الحجم الأقصى 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/10 bg-white/5 rounded-t-xl sticky top-0 z-10">
      <Btn title="تراجع" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="h-3.5 w-3.5"/></Btn>
      <Btn title="إعادة" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="h-3.5 w-3.5"/></Btn>
      <div className="w-px h-5 bg-white/10 mx-1"/>
      <Btn title="عنوان كبير" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-3.5 w-3.5"/></Btn>
      <Btn title="عنوان متوسط" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3.5 w-3.5"/></Btn>
      <Btn title="عنوان صغير" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-3.5 w-3.5"/></Btn>
      <div className="w-px h-5 bg-white/10 mx-1"/>
      <Btn title="عريض" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5"/></Btn>
      <Btn title="مائل" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5"/></Btn>
      <Btn title="تحته خط" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderIcon className="h-3.5 w-3.5"/></Btn>
      <Btn title="مشطوب" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5"/></Btn>
      <Btn title="كود" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-3.5 w-3.5"/></Btn>
      <div className="w-px h-5 bg-white/10 mx-1"/>
      <div className="flex items-center gap-0.5">
        <Palette className="h-3.5 w-3.5 text-muted-foreground mx-0.5"/>
        {COLORS.map(c => (
          <button key={c} type="button" title={c} onClick={() => editor.chain().focus().setColor(c).run()}
            className="w-3.5 h-3.5 rounded-full border border-white/20 hover:scale-125 transition" style={{ background: c }}/>
        ))}
        <button type="button" title="إزالة اللون" onClick={() => editor.chain().focus().unsetColor().run()}
          className="text-[10px] px-1 text-muted-foreground hover:text-foreground">×</button>
      </div>
      <div className="w-px h-5 bg-white/10 mx-1"/>
      <Btn title="محاذاة يمين" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-3.5 w-3.5"/></Btn>
      <Btn title="توسيط" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-3.5 w-3.5"/></Btn>
      <Btn title="محاذاة يسار" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-3.5 w-3.5"/></Btn>
      <Btn title="ضبط" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify className="h-3.5 w-3.5"/></Btn>
      <div className="w-px h-5 bg-white/10 mx-1"/>
      <Btn title="قائمة نقطية" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5"/></Btn>
      <Btn title="قائمة مرقمة" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5"/></Btn>
      <Btn title="اقتباس" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5"/></Btn>
      <Btn title="فاصل" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-3.5 w-3.5"/></Btn>
      <div className="w-px h-5 bg-white/10 mx-1"/>
      <Btn title="رابط (يحول الكلمة المحددة لرابط)" active={editor.isActive("link")} onClick={setLink}><Link2 className="h-3.5 w-3.5"/></Btn>
      <Btn title="إزالة الرابط" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Link2Off className="h-3.5 w-3.5"/></Btn>
      <Btn title="صورة من رابط" onClick={addImageUrl}><ImageIcon className="h-3.5 w-3.5"/></Btn>
      <Btn title="رفع صورة" onClick={() => fileRef.current?.click()}><span className="text-[10px] font-bold">⬆</span></Btn>
      <Btn title="فيديو يوتيوب" onClick={addYoutube}><YtIcon className="h-3.5 w-3.5"/></Btn>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload}/>
    </div>
  );
}

export function RichEditor({ value, onChange, placeholder }:
  { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl my-3 max-w-full mx-auto" } }),
      TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "right" }),
      Youtube.configure({ controls: true, nocookie: true, HTMLAttributes: { class: "rounded-xl my-3 mx-auto max-w-full" } }),
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

  if (!editor) return <div className="glass-input rounded-xl h-72 animate-pulse"/>;

  return (
    <div className="glass-input rounded-xl overflow-hidden">
      <Toolbar editor={editor}/>
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
  return <div className="prose-content text-sm leading-loose" dangerouslySetInnerHTML={{ __html: html }}/>;
}