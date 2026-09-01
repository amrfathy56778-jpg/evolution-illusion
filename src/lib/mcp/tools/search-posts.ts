import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_posts",
  title: "Search articles",
  description: "Search the site's articles by title or content, optionally filtered by category.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Keyword to search in article titles and content."),
    category: z.string().trim().optional().describe("Optional category slug to filter by."),
    limit: z.number().int().min(1).max(25).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("posts")
      .select("id,title,category,author_name,created_at,views_count,content")
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (category) q = q.eq("category", category as never);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const items = (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      author: p.author_name,
      created_at: p.created_at,
      views: p.views_count,
      snippet: String(p.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 400),
    }));
    return { content: [{ type: "text", text: JSON.stringify(items) }], structuredContent: { items } };
  },
});
