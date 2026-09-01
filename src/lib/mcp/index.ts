import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPosts from "./tools/search-posts";
import getPost from "./tools/get-post";
import listRecentPosts from "./tools/list-recent-posts";
import createPost from "./tools/create-post";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "evolving-illusions",
  title: "Evolving Illusions",
  version: "0.1.0",
  instructions:
    "Tools for the Evolving Illusions site (نقد نظرية التطور). Use `search_posts` and `list_recent_posts` to find articles, `get_post` to read one in full, and `create_post` to publish a new article as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPosts, listRecentPosts, getPost, createPost],
});
