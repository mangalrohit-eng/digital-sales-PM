import type { Project } from "@/lib/types"
import { PROJECT_STATUS_LABELS } from "@/lib/types"

/**
 * Project context string sent to AI routes (Brief, Ideas, etc.).
 */
export function buildProjectContextForApi(
  project: Project | undefined,
  projectName: string,
  croContext: string
): string {
  const description = project?.description?.trim() ?? ""
  const lines = [`Initiative: ${projectName.trim() || "(unnamed)"}`]
  if (project) {
    lines.push(`Status: ${PROJECT_STATUS_LABELS[project.status]}`)
    const role = project.ownerRole?.trim()
    lines.push(
      role
        ? `Owner: ${project.owner} (${role})`
        : `Owner: ${project.owner}`
    )
  }
  if (description) {
    lines.push(`Problem Statement:\n${description}`)
  } else {
    lines.push(
      "Problem Statement: (none on file—infer from the initiative name and additional thoughts if any; note assumptions under Open questions)"
    )
  }
  if (croContext.trim()) {
    lines.push(`Additional thoughts:\n${croContext.trim()}`)
  }
  const hist = project?.chatHistory?.filter((m) => m.content?.trim()) ?? []
  if (hist.length > 0) {
    const tail = hist.slice(-16)
    lines.push(
      `Prior initiative chat (most recent last):\n${tail
        .map((m) =>
          m.role === "user"
            ? `PM: ${m.content.trim()}`
            : `Assistant: ${m.content.trim()}`
        )
        .join("\n")}`
    )
  }

  if (project?.ideation && project.selectedIdeationId) {
    const idea = project.ideation.ideas.find(
      (i) => i.id === project.selectedIdeationId
    )
    if (idea) {
      lines.push(
        `--- Selected initiative idea (Ideas tab — flows to Brief & downstream) ---\n**${idea.title}** — ${idea.tagline}\n\n${idea.detailMarkdown}\n\n_Research basis:_\n${idea.researchBasis}`
      )
    }
  }

  return lines.join("\n\n")
}
