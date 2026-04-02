import type { IdeationWorkspace } from "@/lib/types"

/** Markers for idempotent merge of Ideas readout into additional thoughts (`cro_context`). */
export const IDEATION_CONTEXT_START = "<!-- charter-ideas-readout -->"
export const IDEATION_CONTEXT_END = "<!-- /charter-ideas-readout -->"

const LANDSCAPE_EXCERPT_MAX = 2800

function buildStructuredIdeationBlock(
  workspace: IdeationWorkspace,
  ideaId: string
): string | null {
  const idea = workspace.ideas.find((i) => i.id === ideaId)
  if (!idea) return null
  const land = workspace.landscapeMarkdown.trim()
  const landExcerpt =
    land.length > LANDSCAPE_EXCERPT_MAX
      ? `${land.slice(0, LANDSCAPE_EXCERPT_MAX).trim()}…`
      : land
  return [
    "## Selected initiative direction (from Ideas)",
    "",
    `**${idea.title}** — ${idea.tagline}`,
    "",
    idea.detailMarkdown,
    "",
    "### Research basis",
    idea.researchBasis,
    "",
    "### Industry, competition & best practices",
    landExcerpt,
    "",
    "### Sources",
    workspace.sourcesMarkdown.trim(),
  ].join("\n")
}

/** Merge the PM-selected direction + research excerpt into `cro_context`. */
export function mergeSelectedIdeationIntoCroContext(
  current: string,
  workspace: IdeationWorkspace,
  ideaId: string
): string {
  const body = buildStructuredIdeationBlock(workspace, ideaId)
  if (!body) return current
  const block = `${IDEATION_CONTEXT_START}\n\n${body}\n\n${IDEATION_CONTEXT_END}`
  const re =
    /<!-- charter-ideas-readout -->[\s\S]*?<!-- \/charter-ideas-readout -->/
  if (re.test(current)) {
    return current.replace(re, block)
  }
  const sep = current.trim() ? "\n\n" : ""
  return `${current.trimEnd()}${sep}${block}`
}

/** Legacy: single markdown readout. */
export function mergeIdeationIntoCroContext(
  current: string,
  readout: string
): string {
  const body = readout.trim()
  if (!body) return current
  const block = `${IDEATION_CONTEXT_START}\n\n${body}\n\n${IDEATION_CONTEXT_END}`
  const re =
    /<!-- charter-ideas-readout -->[\s\S]*?<!-- \/charter-ideas-readout -->/
  if (re.test(current)) {
    return current.replace(re, block)
  }
  const sep = current.trim() ? "\n\n" : ""
  return `${current.trimEnd()}${sep}${block}`
}
