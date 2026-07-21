import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-emerald">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير متوفرة.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 glow-emerald"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

const antiFouc = `(function(){try{
  var d=document.documentElement;
  var ls=window.localStorage;
  // Theme mode
  var mode=ls.getItem('theme');
  if(mode==='light'){d.classList.add('light');d.classList.remove('dark');}
  else if(mode==='dark'){d.classList.add('dark');d.classList.remove('light');}
  // Design style
  var style=ls.getItem('site.styleId')||'glass';
  ['glass','d1','d3','d4','d5','d6'].forEach(function(s){d.classList.remove('style-'+s);});
  d.classList.add('style-'+style);
  // FX toggle
  if(ls.getItem('site.fxOff')==='1') d.classList.add('fx-off');
  // Language
  var lang=ls.getItem('siteLang');
  var m=document.cookie.match(/googtrans=\\/[^/]+\\/([^;]+)/);
  if(m&&m[1]) lang=m[1];
  if(lang){d.setAttribute('lang',lang);d.setAttribute('dir',lang==='ar'||lang==='he'||lang==='fa'||lang==='ur'?'rtl':'ltr');}
  // Preset tokens (minimal set) to prevent color flash
  var P={
    'd1-scientific-dark':{bg:'oklch(0.14 0.02 150)',fg:'oklch(0.97 0.02 130)',pri:'oklch(0.78 0.18 155)',card:'oklch(0.19 0.03 150)'},
    'd3-cyan-dark':{bg:'oklch(0.14 0.04 220)',fg:'oklch(0.98 0.01 220)',pri:'oklch(0.78 0.16 200)',card:'oklch(0.19 0.05 220)'},
    'd4-papyrus':{bg:'oklch(0.22 0.04 55)',fg:'oklch(0.96 0.03 75)',pri:'oklch(0.62 0.14 45)',card:'oklch(0.28 0.05 55)'},
    'd5-mint-light':{bg:'oklch(0.99 0.005 180)',fg:'oklch(0.2 0.03 180)',pri:'oklch(0.52 0.15 175)',card:'oklch(1 0 0)'},
    'd6-violet-dark':{bg:'oklch(0.14 0.04 305)',fg:'oklch(0.98 0.01 300)',pri:'oklch(0.72 0.19 305)',card:'oklch(0.19 0.06 305)'}
  };
  var id=ls.getItem('site.themeId');
  var t=null;
  if(id==='custom'){try{var raw=ls.getItem('site.customTheme.v2');if(raw){var v=JSON.parse(raw);var isL=d.classList.contains('light');var tk=isL?v.light:v.dark;if(tk)t={bg:tk.background,fg:tk.foreground,pri:tk.primary,card:tk.card};}}catch(e){}}
  else if(id&&P[id]) t=P[id];
  if(t){var s=d.style;s.setProperty('--background',t.bg);s.setProperty('--foreground',t.fg);s.setProperty('--primary',t.pri);s.setProperty('--card',t.card);}
}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "وهم التطور" },
      { name: "description", content: "منصة علمية نقدية تتناول خرافة التطور بالنقد الموضوعي المستند إلى أحدث الأبحاث، مسلّحة بأداة ذكاء اصطناعي متخصصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "وهم التطور" },
      { property: "og:description", content: "منصة علمية نقدية تتناول خرافة التطور بالنقد الموضوعي المستند إلى أحدث الأبحاث، مسلّحة بأداة ذكاء اصطناعي متخصصة." },
      { name: "twitter:title", content: "وهم التطور" },
      { name: "twitter:description", content: "منصة علمية نقدية تتناول خرافة التطور بالنقد الموضوعي المستند إلى أحدث الأبحاث، مسلّحة بأداة ذكاء اصطناعي متخصصة." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/ft3ULPpKzzbP7zYO8zM7VBAFfT72/social-images/social-1777203400827-1741004461598.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/ft3ULPpKzzbP7zYO8zM7VBAFfT72/social-images/social-1777203400827-1741004461598.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=block",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFouc }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
