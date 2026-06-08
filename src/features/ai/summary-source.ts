const blockTagPattern =
  /<\/?(p|div|section|article|header|footer|h[1-6]|li|ul|ol|blockquote|br|tr|td|th)\b[^>]*>/gi;

export function htmlToSummaryText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(blockTagPattern, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncateSummarySource(text: string, maxChars = 24_000) {
  if (text.length <= maxChars) {
    return text;
  }

  return text.slice(0, maxChars).trim();
}
