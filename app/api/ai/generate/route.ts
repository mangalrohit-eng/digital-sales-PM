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

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const {
    type,
    context,
    title,
    agentPrompts: promptsPartial,
  }: {
    type: ArtifactType
    context: string
    title: string
    agentPrompts?: Partial<AgentPromptsState> | null
  } = await req.json()

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
  const userMessage = buildGenerationUserMessage(type, context, prompts)

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: userMessage }],
    temperature: 0.7,
    max_tokens: type === "screen_layout" ? 4500 : 3000,
  })

  const content = completion.choices[0].message.content ?? ""
  return NextResponse.json({ content, title })
}
