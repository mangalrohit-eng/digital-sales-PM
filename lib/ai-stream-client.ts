import {
  planningPreviewWhileStreaming,
  splitWorkbenchPlanningAndDeliverable,
} from "@/lib/ai-reasoning-deliverable"
import { skeletonBriefFromContext } from "@/lib/initiative-brief-skeleton"
import type { ArtifactType } from "@/lib/types"
import type { AgentPromptsState } from "@/lib/agent-prompt-defaults"

/** Pause after planning finishes streaming so the artifact appears slightly later. */
export const ARTIFACT_STREAM_SETTLE_MS = 500

export function settleBeforeArtifact(): Promise<void> {
  return new Promise((r) => setTimeout(r, ARTIFACT_STREAM_SETTLE_MS))
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return
  const ct = res.headers.get("content-type") ?? ""
  if (ct.includes("application/json")) {
    const d = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(d.error ?? "Request failed")
  }
  const t = await res.text()
  throw new Error(t.trim() || "Request failed")
}

function normalizeStreamClientError(err: unknown): Error {
  if (err instanceof Error) {
    const m = err.message.trim().toLowerCase()
    if (
      m === "timeout" ||
      m.includes("timed out") ||
      m.includes("timeout") ||
      m.includes("aborted")
    ) {
      return new Error(
        "The connection timed out or was interrupted while loading the AI response. Try again."
      )
    }
    return err
  }
  if (typeof err === "string") {
    const m = err.toLowerCase()
    if (m === "timeout" || m.includes("timeout")) {
      return new Error(
        "The connection timed out or was interrupted while loading the AI response. Try again."
      )
    }
    return new Error(err)
  }
  return new Error("Stream read failed")
}

export async function readStreamingPlainText(
  res: Response,
  onAccumulated: (full: string) => void
): Promise<string> {
  if (!res.body) throw new Error("No response body")
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ""
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>
      try {
        chunk = await reader.read()
      } catch (readErr) {
        throw normalizeStreamClientError(readErr)
      }
      const { done, value } = chunk
      if (done) break
      full += decoder.decode(value, { stream: true })
      onAccumulated(full)
    }
    full += decoder.decode()
    onAccumulated(full)
    return full
  } catch (e) {
    throw normalizeStreamClientError(e)
  }
}

export async function fetchGenerateStream(
  body: {
    type: ArtifactType
    context: string
    title: string
    agentPrompts: AgentPromptsState
  },
  onPlanningPreview: (text: string) => void
): Promise<{ content: string; planning: string | null; title: string }> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  })
  await throwIfNotOk(res)
  const raw = await readStreamingPlainText(res, (full) => {
    onPlanningPreview(planningPreviewWhileStreaming(full))
  })
  const { planning, deliverable } = splitWorkbenchPlanningAndDeliverable(raw)
  const content = deliverable.trim() ? deliverable.trim() : raw.trim()
  const p = planning.trim() || null
  if (p) onPlanningPreview(p)
  return { content, planning: p, title: body.title }
}

export async function fetchRefineStream(
  body: {
    title: string
    type: ArtifactType
    content: string
    feedback: string
    agentPrompts: AgentPromptsState
  },
  onPlanningPreview: (text: string) => void
): Promise<{ content: string; planning: string | null }> {
  const res = await fetch("/api/ai/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  })
  await throwIfNotOk(res)
  const raw = await readStreamingPlainText(res, (full) => {
    onPlanningPreview(planningPreviewWhileStreaming(full))
  })
  const { planning, deliverable } = splitWorkbenchPlanningAndDeliverable(raw)
  const refined = deliverable.trim() ? deliverable.trim() : raw.trim()
  const p = planning.trim() || null
  if (p) onPlanningPreview(p)
  return { content: refined, planning: p }
}

export async function fetchInitiativeBriefStream(
  body: {
    messages: { role: "user" | "assistant"; content: string }[]
    projectContext?: string
    previousBrief?: string
  },
  onPlanningPreview: (text: string) => void,
  skeletonCtx: { projectContext: string; transcript: string }
): Promise<{ brief: string; planning: string | null }> {
  const res = await fetch("/api/ai/initiative-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  })
  await throwIfNotOk(res)
  const raw = await readStreamingPlainText(res, (full) => {
    onPlanningPreview(planningPreviewWhileStreaming(full))
  })
  const { planning, deliverable } = splitWorkbenchPlanningAndDeliverable(raw)
  let brief = deliverable.trim() ? deliverable.trim() : raw.trim()
  if (!brief.trim()) {
    brief = skeletonBriefFromContext(
      skeletonCtx.projectContext,
      skeletonCtx.transcript
    ).trim()
  }
  const p = planning.trim() || null
  if (p) onPlanningPreview(p)
  return { brief, planning: p }
}
