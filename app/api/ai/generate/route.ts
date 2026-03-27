import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ArtifactType } from "@/lib/types"
import type { AgentPromptsState } from "@/lib/agent-prompt-defaults"
import {
  buildGenerationUserMessage,
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

  const raw = (await req.json()) as {
    type: ArtifactType
    context: string
    title: string
    agentPrompts?: Partial<AgentPromptsState> | null
    stream?: boolean
  }
  const {
    type,
    context,
    title,
    agentPrompts: promptsPartial,
    stream: useStream,
  } = raw

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
    buildGenerationUserMessage(type, context, prompts)
  )

  const openai = new OpenAI({ apiKey })
  const maxTokens = type === "screen_layout" ? 4900 : 3400

  if (useStream) {
    const s = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.7,
      max_tokens: maxTokens,
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
    temperature: 0.7,
    max_tokens: maxTokens,
  })

  const full = messageContentToString(completion.choices[0].message.content)
  const { planning, deliverable } = splitWorkbenchPlanningAndDeliverable(full)
  const content = deliverable.trim() ? deliverable.trim() : full.trim()
  return NextResponse.json({
    content,
    title,
    planning: planning.trim() || null,
  })
}
