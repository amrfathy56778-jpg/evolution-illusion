import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_post",
  title: "Get article",
  description: "Fetch a single article's full content by its id.",
  inputSchema: { id: z.string().uuid().describe("Article id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,category,author_name,created_at,updated_at,views_count,cover_image_url,content")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Article not found" }], isError: true };
    const post = { ...data, text: String(data.content ?? "").replace(/<[^>]+>/g, " ").trim() };
    return { content: [{ type: "text", text: JSON.stringify(post) }], structuredContent: { post } };
  },
});
