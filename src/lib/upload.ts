import { supabase } from "@/integrations/supabase/client";

/** Upload a file to the post-media bucket and return its public URL. */
export async function uploadToBucket(f: File): Promise<string> {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("post-media").upload(path, f, {
    contentType: f.type, upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a cover image (8MB limit). Returns URL or null on failure (with toast). */
export async function uploadCoverImage(f: File, maxMB = 8): Promise<string | null> {
  if (f.size > maxMB * 1024 * 1024) throw new Error(`حجم الصورة الأقصى ${maxMB}MB`);
  return uploadToBucket(f);
}