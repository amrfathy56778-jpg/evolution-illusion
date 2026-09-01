import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main dir="rtl" className="min-h-screen grid place-items-center p-6 text-center">
      <p className="text-sm text-muted-foreground">
        تعذّر تحميل طلب المصادقة: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "تطبيق خارجي";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const t = data?.redirect_url ?? data?.redirect_to;
    if (!t) { setBusy(false); setError("لم يُرجع خادم المصادقة رابط عودة."); return; }
    window.location.href = t;
  }

  return (
    <main dir="rtl" className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 glass-strong p-6 space-y-4 text-right">
        <h1 className="text-lg font-bold">ربط {clientName} بحسابك</h1>
        <p className="text-sm text-muted-foreground">
          سيتمكّن {clientName} من استخدام أدوات موقع «وهم التطور» بصفتك أنت — قراءة المقالات ونشر مقال جديد
          وفق صلاحيات حسابك فقط.
        </p>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button disabled={busy} onClick={() => decide(false)}
            className="glass-input rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50">رفض</button>
          <button disabled={busy} onClick={() => decide(true)}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-bold disabled:opacity-50">
            موافقة
          </button>
        </div>
      </div>
    </main>
  );
}
