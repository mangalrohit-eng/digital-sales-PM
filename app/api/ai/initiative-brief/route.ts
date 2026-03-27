import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest } from "next/server"
import { cookies } from "next/headers"

export const maxDuration = 60

const SYSTEM = `You maintain a single "initiative brief" document for a product manager working on Spectrum.com digital sales.

The brief must stay THIN: at most ~250 words, tight markdown, no fluff.

Structure using these level-2 headings (omit a section only if truly unknown, say "TBD — …" one short phrase):
## Problem / outcome
## Audience & context
## Success signals
## Bets & scope hints
## Risks & dependencies
## Open questions

Rules:
- Synthesize ONLY from the discovery chat transcript and the initiative context block—no invented competitors or metrics unless they appeared in the chat or context.
- If the chat is very short, still produce a minimal brief and note what's unknown in Open questions.
- Update incrementally: preserve stable facts from the previous brief when the new chat does not contradict them.
- Output ONLY the markdown brief, no preamble or closing commentary.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body: {
    messages: { role: "user" | "assistant"; content: string }[]
    projectContext?: string
    previousBrief?: string
  } = await req.json()

  const { messages, projectContext, previousBrief } = body

  const cookieStore = await cookies()
  const runtimeKey = cookieStore.get("openai_key")?.value
  const apiKey = runtimeKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "OpenAI API key not configured. Go to Settings to add your key.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const transcript = (messages ?? [])
    .map(
      (m) =>
        `${m.role === "user" ? "PM" : "Sage"}: ${m.content.trim()}`
    )
    .join("\n\n")

  const userParts: string[] = []
  if (projectContext?.trim()) {
    userParts.push(
      `--- Initiative context (ground truth) ---\n${projectContext.trim()}`
    )
  }
  if (previousBrief?.trim()) {
    userParts.push(
      `--- Previous brief (revise, don't drop facts the chat still supports) ---\n${previousBrief.trim()}`
    )
  }
  userParts.push(
    `--- Discovery transcript ---\n${transcript || "(empty — produce a minimal skeleton brief.)"}`
  )

  const openai = new OpenAI({ apiKey })
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 900,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userParts.join("\n\n") },
    ],
  })

  const brief = completion.choices[0]?.message?.content?.trim() ?? ""

  return new Response(JSON.stringify({ brief }), {
    headers: { "Content-Type": "application/json" },
  })
}
