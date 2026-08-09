/** يزيل علامات * و ** من بدايات أسطر ردود الذكاء الاصطناعي. */
export function cleanAiText(text: string): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*\*{1,3}\s*/, "").replace(/^\s*\*{1,3}\s*$/, ""))
    .join("\n");
}