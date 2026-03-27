/**
 * Strip leading ```lang … and one trailing ``` so inline `…` rules do not treat
 * the language tag (e.g. markdown) as a code span. Handles unclosed fences by
 * dropping the opener only. Safe to call from parsers that split on **Story** etc.
 */
export function stripOuterMarkdownFence(md: string): string {
  let s = md.trim()
  for (let depth = 0; depth < 5; depth++) {
    if (!s.startsWith("```")) break
    const firstNl = s.indexOf("\n")
    const firstLine = firstNl === -1 ? s : s.slice(0, firstNl)
    if (!/^```[\w-]*$/.test(firstLine.trim())) break
    let inner = firstNl === -1 ? "" : s.slice(firstNl + 1)
    inner = inner.replace(/\r?\n```\s*$/, "")
    inner = inner.replace(/```\s*$/, "")
    s = inner.trim()
  }
  return s
}

/** Minimal markdown → HTML for in-app previews (no external deps). */
export function renderMarkdown(md: string): string {
  const body = stripOuterMarkdownFence(md)
  return (
    body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^#{1}\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{4}\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/(.+)(?<!>)\n/g, "$1<br>")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("<")) return line
      return `<p>${line}</p>`
    })
    .join("\n")
  )
}
