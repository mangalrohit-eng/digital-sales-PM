import {
  planningPreviewWhileStreaming,
  splitWorkbenchPlanningAndDeliverable,
} from "@/lib/ai-reasoning-deliverable"
import { skeletonBriefFromContext } from "@/lib/initiative-brief-skeleton"
import type { ArtifactType, ChatMessage, IdeationWorkspace } from "@/lib/types"
import type { AgentPromptsState } from "@/lib/agent-prompt-defaults"

/** Pause after planning finishes streaming so the artifact appears slightly later. */
export const ARTIFACT_STREAM_SETTLE_MS = 500

export function settleBeforeArtifact(): Promise<void> {
  return new Promise((r) => setTimeout(r, ARTIFACT_STREAM_SETTLE_MS))
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return
  const ct = res.headers.get("content-type") ?? ""
  let message = "Request failed"
  if (ct.includes("application/json")) {
    const d = (await res.json().catch(() => ({}))) as { error?: string }
    message = d.error?.trim() || message
  } else {
    const t = await res.text()
    message = t.trim() || message
  }
  throw normalizeStreamClientError(new Error(message))
}

function normalizeStreamClientError(err: unknown): Error {
  const name =
    err !== null &&
    typeof err === "object" &&
    "name" in err &&
    typeof (err as { name: unknown }).name === "string"
      ? (err as { name: string }).name
      : err instanceof Error
        ? err.name
        : ""
  const rawMsg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : err !== null &&
            typeof err === "object" &&
            "message" in err &&
            typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : ""
  const m = rawMsg.trim().toLowerCase()
  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    m === "timeout" ||
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("aborted") ||
    m.includes("networkerror") ||
    m.includes("failed to fetch")
  ) {
    return new Error(
      "The connection timed out or was interrupted while loading the AI response. Try again."
    )
  }
  if (err instanceof Error) return err
  if (typeof err === "string" && err.trim()) return new Error(err.trim())
  return new Error("Stream read failed")
}

/** User-facing copy for AI/stream fetch failures (timeouts, network, etc.). */
export function aiClientErrorMessage(err: unknown): string {
  return normalizeStreamClientError(
    err instanceof Error ? err : new Error(typeof err === "string" ? err : "Request failed")
  ).message
}

async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (e) {
    throw normalizeStreamClientError(e)
  }
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
  const res = await safeFetch("/api/ai/generate", {
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
  const res = await safeFetch("/api/ai/refine", {
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
  const res = await safeFetch("/api/ai/initiative-brief", {
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

export async function fetchIdeation(body: {
  projectContext: string
  ideationChatTranscript?: string
}): Promise<{ ideation: IdeationWorkspace }> {
  const res = await safeFetch("/api/ai/ideation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await throwIfNotOk(res)
  const data = (await res.json()) as { ideation?: IdeationWorkspace }
  if (
    !data.ideation ||
    !Array.isArray(data.ideation.ideas) ||
    data.ideation.ideas.length === 0
  ) {
    throw new Error("Empty ideation response")
  }
  return { ideation: data.ideation }
}

export async function fetchIdeationChatStream(
  body: {
    messages: { role: "user" | "assistant"; content: string }[]
    projectContext: string
    ideasDigest?: string
    selectedIdeaId?: string | null
    agentPrompts: AgentPromptsState
  },
  onAccumulated: (full: string) => void
): Promise<string> {
  const res = await safeFetch("/api/ai/ideation-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await throwIfNotOk(res)
  return readStreamingPlainText(res, onAccumulated)
}

export async function fetchIdeationMerge(body: {
  workspace: IdeationWorkspace
  ideationChat: ChatMessage[]
  projectContext: string
}): Promise<{ ideation: IdeationWorkspace }> {
  const res = await safeFetch("/api/ai/ideation-merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await throwIfNotOk(res)
  const data = (await res.json()) as { ideation?: IdeationWorkspace }
  if (
    !data.ideation ||
    !Array.isArray(data.ideation.ideas) ||
    data.ideation.ideas.length === 0
  ) {
    throw new Error("Empty merge response")
  }
  return { ideation: data.ideation }
}
