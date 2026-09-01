import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Publish article",
  description: "Publish a new article on the site as the signed-in user. Content may be HTML.",
  inputSchema: {
    title: z.string().trim().min(3).describe("Article title."),
    content: z.string().trim().min(1).describe("Article body (HTML or plain text)."),
    category: z.string().trim().describe("Category slug, e.g. one used elsewhere on the site."),
    cover_image_url: z.string().url().optional().describe("Optional cover image URL."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, content, category, cover_image_url }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        title,
        content,
        category: category as never,
        cover_image_url: cover_image_url ?? null,
        author_id: ctx.getUserId(),
      })
      .select("id,title,category,created_at");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data?.[0]) }], structuredContent: { post: data?.[0] } };
  },
});
