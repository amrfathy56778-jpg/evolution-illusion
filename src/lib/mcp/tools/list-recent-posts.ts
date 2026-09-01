import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_posts",
  title: "List recent articles",
  description: "List the most recently published articles, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Number of articles (default 10)."),
    category: z.string().trim().optional().describe("Optional category slug to filter by."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, category }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("posts")
      .select("id,title,category,author_name,created_at,views_count")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (category) q = q.eq("category", category as never);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const items = data ?? [];
    return { content: [{ type: "text", text: JSON.stringify(items) }], structuredContent: { items } };
  },
});
