/** يزيل علامات * و ** من بدايات أسطر ردود الذكاء الاصطناعي. */
export function cleanAiText(text: string): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*\*{1,3}\s*/, "").replace(/^\s*\*{1,3}\s*$/, ""))
    .join("\n");
}

/** يزيل كل علامات النجمة (تشديد ماركداون) من النص — للملخصات المعروضة كنص عادي. */
export function stripStars(text: string): string {
  if (!text) return text;
  return cleanAiText(text)
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    .replace(/\*+/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "");
}
