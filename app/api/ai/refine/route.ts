import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { ArtifactType } from "@/lib/types"
import type { AgentPromptsState } from "@/lib/agent-prompt-defaults"
import {
  buildQuillUserMessage,
  resolveAgentPrompts,
} from "@/lib/agent-prompt-build"
import { messageContentToString } from "@/lib/openai-message-text"
import {
  appendWorkbenchPlanningSuffix,
  splitWorkbenchPlanningAndDeliverable,
} from "@/lib/ai-reasoning-deliverable"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = (await req.json()) as {
    title: string
    type: ArtifactType
    content: string
    feedback: string
    agentPrompts?: Partial<AgentPromptsState> | null
    stream?: boolean
  }

  const {
    title,
    type,
    content,
    feedback,
    agentPrompts: promptsPartial,
    stream: useStream,
  } = body
  if (!content?.trim() || !feedback?.trim()) {
    return NextResponse.json(
      { error: "Content and feedback are required." },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  const runtimeKey = cookieStore.get("openai_key")?.value
  const apiKey = runtimeKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Go to Settings to add your key." },
      { status: 400 }
    )
  }

  const prompts = resolveAgentPrompts(promptsPartial ?? null)
  const userMessage = appendWorkbenchPlanningSuffix(
    buildQuillUserMessage(type, title, content, feedback, prompts)
  )

  const openai = new OpenAI({ apiKey })

  if (useStream) {
    const s = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.5,
      max_tokens: 4400,
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
    model: "gpt-4o",
    messages: [{ role: "user", content: userMessage }],
    temperature: 0.5,
    max_tokens: 4400,
  })

  const raw = messageContentToString(completion.choices[0].message.content)
  const { planning, deliverable } = splitWorkbenchPlanningAndDeliverable(raw)
  const refined = deliverable.trim() ? deliverable.trim() : raw.trim()
  return NextResponse.json({
    content: refined,
    planning: planning.trim() || null,
  })
}
