import { auth } from "@/auth"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import {
  createRouteOpenAI,
  openAiFailureMessage,
} from "@/lib/openai-route-helpers"
import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import type { AgentPromptsState } from "@/lib/agent-prompt-defaults"
import {
  buildSageSystemContent,
  resolveAgentPrompts,
} from "@/lib/agent-prompt-build"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body: {
    messages: ChatCompletionMessageParam[]
    projectContext?: string
    agentPrompts?: Partial<AgentPromptsState> | null
  } = await req.json()

  const { messages, projectContext, agentPrompts: promptsPartial } = body

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

  const prompts = resolveAgentPrompts(promptsPartial ?? null)
  const systemContent = buildSageSystemContent(projectContext, prompts)

  const openai = createRouteOpenAI(apiKey)

  let stream: Awaited<
    ReturnType<typeof openai.chat.completions.create>
  >
  try {
    stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [{ role: "system", content: systemContent }, ...messages],
      temperature: 0.8,
      max_tokens: 1500,
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: openAiFailureMessage(e) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  const encoder = new TextEncoder()
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ""
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      } catch (err) {
        const e = new Error(openAiFailureMessage(err))
        try {
          controller.error(e)
        } catch {
          /* stream already closed */
        }
      }
    },
  })

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
