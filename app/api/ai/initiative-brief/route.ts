import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { messageContentToString } from "@/lib/openai-message-text"
import {
  appendWorkbenchPlanningSuffix,
  splitWorkbenchPlanningAndDeliverable,
} from "@/lib/ai-reasoning-deliverable"
import { skeletonBriefFromContext } from "@/lib/initiative-brief-skeleton"

export const maxDuration = 60

const SYSTEM = `You maintain a single "initiative brief" document for a product manager working on Spectrum.com digital sales.

The brief must stay THIN: at most ~250 words, tight markdown, no fluff.

Structure using these level-2 headings (every section should have at least one substantive bullet or sentence—use "TBD — …" only when the initiative context truly offers nothing for that area):
## Problem / outcome
## Audience & context
## Success signals
## Bets & scope hints
## Risks & dependencies
## Open questions

Rules:
- Ground the brief in the **initiative context** block (name, description, product/funnel context, owner, status). That block is the same information the PM entered on the initiative Overview.
- If the **discovery transcript** is empty or very short, still write a **complete** brief: infer gaps with **reasonable, conservative** assumptions for a cable/broadband digital sales funnel (self-service online ordering, plan selection, eligibility, cart/checkout, disclosures, handoff to install/support). Do not fabricate specific competitors, regulatory citations, or numeric KPIs unless they appear in context or transcript—prefer qualitative success signals (e.g. conversion clarity, funnel completion, support volume).
- List notable assumptions or items to confirm as short bullets under **Open questions** (e.g. "Confirm primary segment …").
- When refining, preserve stable facts from the previous brief unless the new transcript contradicts them.
- Output order is mandatory for the app UI: your **very first characters** must start the line <<<WORKBENCH_PLANNING>>> (exact spelling), then 3–6 short planning lines, then a line <<<WORKBENCH_DELIVERABLE>>> (exact), then ONLY the markdown brief (the ## sections). No title, no preamble before <<<WORKBENCH_PLANNING>>>, no commentary after the brief.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[]
    projectContext?: string
    previousBrief?: string
    stream?: boolean
  }

  const { messages, projectContext, previousBrief, stream: useStream } = body

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

  const userContent = appendWorkbenchPlanningSuffix(userParts.join("\n\n"))

  const openai = new OpenAI({ apiKey })
  try {
    if (useStream) {
      const s = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 1100,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
      })
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of s) {
              const text = chunk.choices[0]?.delta?.content || ""
              if (text) controller.enqueue(encoder.encode(text))
            }
          } finally {
            controller.close()
          }
        },
      })
      return new Response(readableStream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 1100,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    })

    const raw = messageContentToString(completion.choices[0]?.message?.content)
    const { planning, deliverable } = splitWorkbenchPlanningAndDeliverable(raw)
    let brief = deliverable.trim() ? deliverable.trim() : raw.trim()
    if (!brief) {
      brief = skeletonBriefFromContext(
        projectContext ?? "",
        transcript
      ).trim()
    }

    return NextResponse.json({
      brief,
      planning: planning.trim() || null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Brief generation failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
