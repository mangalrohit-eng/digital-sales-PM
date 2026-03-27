import OpenAI from "openai"

/** Longer than typical workbench generations; platform route limits may still apply. */
const ROUTE_OPENAI_TIMEOUT_MS = 180_000

export function createRouteOpenAI(apiKey: string) {
  return new OpenAI({
    apiKey,
    timeout: ROUTE_OPENAI_TIMEOUT_MS,
    maxRetries: 1,
  })
}

export function openAiFailureMessage(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.trim()
    if (!m) return "OpenAI request failed."
    const low = m.toLowerCase()
    if (
      low === "timeout" ||
      low.includes("timed out") ||
      low.includes("timeout")
    ) {
      return "The OpenAI request timed out. Try again, or shorten the content and retry."
    }
    return m
  }
  if (typeof err === "string" && err.trim()) {
    const low = err.toLowerCase()
    if (low === "timeout" || low.includes("timeout")) {
      return "The OpenAI request timed out. Try again, or shorten the content and retry."
    }
    return err.trim()
  }
  return "OpenAI request failed."
}
