// Rewrites Supabase Storage public URLs to the on-the-fly image
// transformation endpoint so lists and articles ship small WebP
// thumbnails instead of the raw multi-megabyte originals.
export function thumb(url: string | null | undefined, width = 800, quality = 70): string {
  if (!url) return "";
  try {
    // Only transform Supabase public object URLs.
    if (!/\/storage\/v1\/object\/public\//.test(url)) return url;
    // Skip animated/vector formats — transformer would rasterize them.
    if (/\.(gif|svg)(\?|$)/i.test(url)) return url;
    const rendered = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    const sep = rendered.includes("?") ? "&" : "?";
    return `${rendered}${sep}width=${width}&quality=${quality}&resize=contain`;
  } catch {
    return url;
  }
}

// Rewrite <img src="…supabase…object/public/…"> inside stored HTML so
// in-article images also flow through the transformer.
export function transformHtmlImages(html: string, width = 900, quality = 72): string {
  return html.replace(/<img\b([^>]*?)\bsrc=(["'])([^"']+)\2/gi, (m, attrs, q, src) => {
    const t = thumb(src, width, quality);
    return `<img${attrs} src=${q}${t}${q}`;
  });
}