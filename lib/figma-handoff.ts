/** Subset of Frame JSON from AI / Figma-oriented handoff. */
export interface FigmaHandoffChild {
  type?: string
  name?: string
  characters?: string
  fontSize?: number
  fontWeight?: number
  width?: number
  height?: number
  layoutMode?: string
  padding?: number
  itemSpacing?: number
  children?: FigmaHandoffChild[]
}

export interface FigmaHandoffFrame {
  name?: string
  width?: number
  height?: number
  layoutMode?: string
  padding?: number
  itemSpacing?: number
  children?: FigmaHandoffChild[]
}

export interface FigmaHandoffDocument {
  figmaHandoffVersion?: string
  figmaImportVersion?: string
  document?: {
    name?: string
    frames?: FigmaHandoffFrame[]
    components?: unknown[]
    tokens?: unknown
  }
}

function isFigmaHandoffRoot(x: unknown): x is FigmaHandoffDocument {
  if (!x || typeof x !== "object") return false
  const o = x as Record<string, unknown>
  const doc = o.document
  if (!doc || typeof doc !== "object") return false
  const frames = (doc as Record<string, unknown>).frames
  return Array.isArray(frames) && frames.length > 0
}

function hasDocumentObject(x: unknown): x is object {
  if (!x || typeof x !== "object") return false
  const doc = (x as Record<string, unknown>).document
  return typeof doc === "object" && doc !== null
}

/**
 * Split markdown spec from the trailing ```json``` handoff block (if present).
 * Only strips JSON that includes at least one frame (so we never hide JSON we cannot preview).
 */
export function parseFigmaHandoff(content: string): {
  markdown: string
  handoff: FigmaHandoffDocument | null
} {
  const re = /```(?:json)?\s*([\s\S]*?)```/gi
  const matches: { raw: string; handoff: FigmaHandoffDocument }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown
      if (isFigmaHandoffRoot(parsed)) {
        matches.push({ raw: m[0], handoff: parsed })
      }
    } catch {
      /* not JSON */
    }
  }
  if (matches.length === 0) {
    return { markdown: content, handoff: null }
  }
  const last = matches[matches.length - 1]
  let markdown = content
  for (const hit of matches) {
    markdown = markdown.replace(hit.raw, "\n\n")
  }
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim()
  return { markdown, handoff: last.handoff }
}

/** Last fenced JSON with a `document` object (for download / export). */
export function extractFigmaHandoffObject(content: string): object | null {
  const re = /```(?:json)?\s*([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  let last: object | null = null
  while ((m = re.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown
      if (hasDocumentObject(parsed)) {
        last = parsed as object
      }
    } catch {
      /* skip */
    }
  }
  return last
}
