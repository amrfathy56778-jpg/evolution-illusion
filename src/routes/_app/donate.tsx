import { createFileRoute } from "@tanstack/react-router";
import { Heart, Coffee, DollarSign, Bitcoin, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_app/donate")({
  component: DonatePage,
  head: () => ({
    meta: [
      { title: "ادعم الموقع · وهم التطور" },
      { name: "description", content: "ساهم في استمرار موقع وهم التطور عبر طرق دفع متعددة." },
    ],
  }),
});

type Method = {
  name: string;
  desc: string;
  url: string;
  icon: any;
  color: string;
};

const METHODS: Method[] = [
  {
    name: "PayPal",
    desc: "تبرع ببطاقة ائتمان أو رصيد PayPal",
    url: "https://www.paypal.com/paypalme/",
    icon: DollarSign,
    color: "var(--c-evolution)",
  },
  {
    name: "Buy Me a Coffee",
    desc: "ادعمنا بفنجان قهوة رمزي",
    url: "https://www.buymeacoffee.com/",
    icon: Coffee,
    color: "var(--c-guest)",
  },
  {
    name: "Ko-fi",
    desc: "تبرع لمرة واحدة أو شهرياً",
    url: "https://ko-fi.com/",
    icon: Heart,
    color: "var(--c-critique)",
  },
  {
    name: "العملات الرقمية",
    desc: "Bitcoin / USDT — تواصل معنا للحصول على العنوان",
    url: "mailto:donate@example.com?subject=Crypto%20Donation",
    icon: Bitcoin,
    color: "var(--c-genetics)",
  },
];

function DonatePage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <section className="glass-strong rounded-3xl p-6 text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl glass grid place-items-center text-3xl">💚</div>
        <h1 className="text-3xl font-black text-gradient-emerald">ادعم وهم التطور</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          استمرار الموقع وتطوير محتواه العلمي يعتمد على دعمكم. كل تبرع — مهما كان رمزياً — يساعدنا
          على تغطية تكاليف الاستضافة، الذكاء الاصطناعي، والمحتوى.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        {METHODS.map((m) => {
          const Icon = m.icon;
          return (
            <a
              key={m.name}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-2xl p-4 hover:scale-[1.02] transition flex items-center gap-3"
              style={{ borderColor: `color-mix(in oklab, ${m.color} 35%, transparent)` }}
            >
              <div
                className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
                style={{ background: `color-mix(in oklab, ${m.color} 22%, transparent)`, color: m.color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm" style={{ color: m.color }}>{m.name}</div>
                <div className="text-[11px] text-muted-foreground">{m.desc}</div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          );
        })}
      </section>

      <p className="text-xs text-center text-muted-foreground">
        ملاحظة: الروابط أعلاه روابط دفع خارجية. جزاكم الله خيراً 🤍
      </p>
    </div>
  );
}