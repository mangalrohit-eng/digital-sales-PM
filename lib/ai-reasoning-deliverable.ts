/** Markers must appear on their own lines so the UI can split planning from the artifact. */
export const WORKBENCH_PLANNING_MARK = "<<<WORKBENCH_PLANNING>>>"
export const WORKBENCH_DELIVERABLE_MARK = "<<<WORKBENCH_DELIVERABLE>>>"

export const WORKBENCH_PLANNING_DELIVERABLE_SUFFIX = `

---
Output format (required):
1) On its own line, exactly: ${WORKBENCH_PLANNING_MARK}
2) Then 3–8 short lines (bullets or sentences): your approach, key constraints, and what you will produce—no markdown headings in this block.
3) On its own line, exactly: ${WORKBENCH_DELIVERABLE_MARK}
4) Then output ONLY the deliverable described in the instructions above (the artifact body). Do not add commentary after the deliverable.`

export function appendWorkbenchPlanningSuffix(promptBody: string): string {
  const t = promptBody.trimEnd()
  return `${t}${WORKBENCH_PLANNING_DELIVERABLE_SUFFIX}`
}

function indexIgnoreCase(haystack: string, needle: string): number {
  return haystack.toLowerCase().indexOf(needle.toLowerCase())
}

export function splitWorkbenchPlanningAndDeliverable(raw: string): {
  planning: string
  deliverable: string
} {
  const text = raw.trim()
  const pMark = WORKBENCH_PLANNING_MARK
  const dMark = WORKBENCH_DELIVERABLE_MARK
  const pIdx = indexIgnoreCase(text, pMark)
  const dIdx = indexIgnoreCase(text, dMark)

  if (pIdx !== -1 && dIdx !== -1 && dIdx > pIdx) {
    return {
      planning: text.slice(pIdx + pMark.length, dIdx).trim(),
      deliverable: text.slice(dIdx + dMark.length).trim(),
    }
  }
  if (dIdx !== -1) {
    return {
      planning:
        pIdx !== -1 && pIdx < dIdx
          ? text.slice(pIdx + pMark.length, dIdx).trim()
          : text.slice(0, dIdx).trim(),
      deliverable: text.slice(dIdx + dMark.length).trim(),
    }
  }
  if (pIdx !== -1) {
    return {
      planning: text.slice(pIdx + pMark.length).trim(),
      deliverable: "",
    }
  }
  return { planning: "", deliverable: text }
}

/** Text to show in the footer while tokens stream in (hide deliverable section until complete). */
export function planningPreviewWhileStreaming(buffer: string): string {
  const text = buffer
  const pMark = WORKBENCH_PLANNING_MARK
  const dMark = WORKBENCH_DELIVERABLE_MARK
  const pIdx = indexIgnoreCase(text, pMark)
  const dIdx = indexIgnoreCase(text, dMark)

  if (dIdx !== -1) {
    if (pIdx !== -1 && dIdx > pIdx) {
      return text.slice(pIdx + pMark.length, dIdx).trim()
    }
    return text.slice(0, dIdx).trim()
  }
  if (pIdx !== -1) {
    return text.slice(pIdx + pMark.length).trim()
  }
  return text.trim()
}
