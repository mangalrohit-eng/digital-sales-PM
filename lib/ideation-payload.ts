import type { IdeationIdea, IdeationWorkspace } from "@/lib/types"

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

function normalizeIdea(raw: unknown, index: number): IdeationIdea | null {
  if (!isRecord(raw)) return null
  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  const tagline = typeof raw.tagline === "string" ? raw.tagline.trim() : ""
  const detailMarkdown =
    typeof raw.detailMarkdown === "string" ? raw.detailMarkdown.trim() : ""
  const researchBasis =
    typeof raw.researchBasis === "string" ? raw.researchBasis.trim() : ""
  let id = typeof raw.id === "string" ? raw.id.trim() : ""
  if (!id) id = `idea-${index + 1}`
  if (!title || !detailMarkdown) return null
  return {
    id,
    title,
    tagline: tagline || title,
    detailMarkdown,
    researchBasis: researchBasis || "—",
  }
}

/** Validate and normalize API JSON into a workspace object. */
export function parseIdeationPayload(raw: unknown): IdeationWorkspace | null {
  if (!isRecord(raw)) return null
  const problemRestatement =
    typeof raw.problemRestatement === "string"
      ? raw.problemRestatement.trim()
      : ""
  const landscapeMarkdown =
    typeof raw.landscapeMarkdown === "string"
      ? raw.landscapeMarkdown.trim()
      : ""
  const sourcesMarkdown =
    typeof raw.sourcesMarkdown === "string"
      ? raw.sourcesMarkdown.trim()
      : ""
  const ideasRaw = raw.ideas
  if (!Array.isArray(ideasRaw)) return null
  const ideas: IdeationIdea[] = []
  const seen = new Set<string>()
  ideasRaw.forEach((item, i) => {
    const idea = normalizeIdea(item, i)
    if (!idea) return
    let uid = idea.id
    let n = 0
    while (seen.has(uid)) {
      n += 1
      uid = `${idea.id}-${n}`
    }
    seen.add(uid)
    ideas.push({ ...idea, id: uid })
  })
  if (ideas.length < 3) return null
  if (!landscapeMarkdown && !problemRestatement) return null
  return {
    problemRestatement:
      problemRestatement || "Problem framing to be refined in Brief.",
    landscapeMarkdown:
      landscapeMarkdown ||
      "_Landscape section was empty — regenerate or enrich in Brief._",
    ideas,
    sourcesMarkdown: sourcesMarkdown || "_No sources captured._",
  }
}
