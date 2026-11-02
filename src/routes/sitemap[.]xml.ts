import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";

// Public site origin — do not use preview/project-id URLs here.
const BASE_URL = "https://evolution-illusion.lovable.app";
const POST_ROUTE_ID = "/_app/post/$id";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        try {
          const router = await getRouterInstance();
          const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

          const postRoute = (router.routesById as Record<string, any>)[POST_ROUTE_ID];
          if (isSitemapRouteIncluded(postRoute)) {
            const { createClient } = await import("@supabase/supabase-js");
            const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
            const url = process.env["SUPABASE_URL"];
            if (!key || !url) throw new Error("Missing Supabase public credentials");
            const db = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
              global: { fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                // Opaque sb_ keys are not JWTs; send apikey without the default bearer.
                if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) headers.delete("Authorization");
                headers.set("apikey", key);
                return fetch(input, { ...init, headers });
              } },
            });

            const pageSize = 1000;
            for (let offset = 0; ; ) {
              const { data, error } = await db
                .from("posts")
                .select("id, created_at, updated_at")
                .order("id")
                .range(offset, offset + pageSize - 1);
              if (error) throw error;
              if (!data || data.length === 0) break;
              for (const row of data) {
                const location = router.buildLocation({
                  to: "/post/$id",
                  params: { id: row.id },
                  search: () => ({}),
                  hash: "",
                });
                const path = sitemapPathForLocation(router, location, POST_ROUTE_ID);
                if (!path) continue;
                const d = new Date(row.updated_at ?? row.created_at);
                entries.push({ path, lastmod: isNaN(d.getTime()) ? undefined : d.toISOString() });
              }
              offset += data.length;
            }
          }

          if (entries.length === 0) {
            return new Response(
              "No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting \"exclude-subtree\" on the root excludes the entire site.",
              { status: 404, headers: { "Cache-Control": "no-store" } },
            );
          }
          return new Response(sitemapXML(BASE_URL, entries), {
            headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
          });
        } catch (e) {
          return new Response("Sitemap error: " + ((e as Error)?.message ?? "unknown"), {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
