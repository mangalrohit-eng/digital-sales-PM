/**
 * Models often prepend "Certainly! Here are…" or put that inside **Epic 1:** titles.
 * Strip leading prose before the first real epic marker.
 */
export function stripMarkdownPreambleBeforeFirstEpic(markdown: string): string {
  const n = markdown.replace(/\r\n/g, "\n").trim()
  if (!n) return n

  const boldIdx = n.search(/\*\*Epic\s*1\s*:/)
  if (boldIdx > 0) return n.slice(boldIdx).trim()

  const lines = n.split("\n")
  const epicHeadingLine = lines.findIndex((l) =>
    /^#{2,4}\s*Epic\s*1\b/i.test(l.trim())
  )
  if (epicHeadingLine > 0) return lines.slice(epicHeadingLine).join("\n").trim()

  return n
}

/** Heuristic: intro sentences the model wrongly uses as epic titles. */
const EPIC_TITLE_PREAMBLE_RE =
  /^(Certainly|Here are|Below|The following|This document|I've organized|I have organized|I've|I have|Below is|These are|Here is)\b/i

const MAX_EPIC_TITLE_LEN = 88

/**
 * Normalize epic title for sidebar / cards when the model uses a full sentence.
 */
export function sanitizeEpicTitle(raw: string, fallbackIndex: number): string {
  const t = raw.replace(/\*\*/g, "").trim()
  if (!t) return `Epic ${fallbackIndex}`
  if (EPIC_TITLE_PREAMBLE_RE.test(t) || t.length > MAX_EPIC_TITLE_LEN) {
    return `Epic ${fallbackIndex}`
  }
  return t
}

/** Filters ##-style sections that are intro fluff, not real epic headings. */
export function isPlausibleEpicSectionHeading(title: string): boolean {
  const t = title.trim()
  if (!t) return false
  if (EPIC_TITLE_PREAMBLE_RE.test(t)) return false
  if (t.length > MAX_EPIC_TITLE_LEN) return false
  return true
}

/**
 * Split epic markdown on **Epic N:** markers and drop preamble text the model
 * often emits before the first epic (e.g. "Certainly! Here are…").
 */
export function splitEpicBoldBlocks(markdown: string): string[] {
  const normalized = stripMarkdownPreambleBeforeFirstEpic(
    markdown.replace(/\r\n/g, "\n").trim()
  )
  if (!normalized) return []
  return normalized
    .split(/(?=\*\*Epic \d+)/g)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && /^\*\*Epic \d+:/.test(b))
}
