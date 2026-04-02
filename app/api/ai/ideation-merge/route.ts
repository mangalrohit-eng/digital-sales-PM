import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import {
  createRouteOpenAI,
  openAiFailureMessage,
} from "@/lib/openai-route-helpers"
import { cookies } from "next/headers"
import type { ChatMessage, IdeationWorkspace } from "@/lib/types"
import { parseIdeationPayload } from "@/lib/ideation-payload"
import { IDEATION_WORKSPACE_JSON_SCHEMA } from "@/lib/ideation-workspace-json-schema"

export const maxDuration = 120

function chatTranscript(msgs: ChatMessage[]): string {
  return msgs
    .map((m) =>
      m.role === "user" ? `PM: ${m.content.trim()}` : `Scout: ${m.content.trim()}`
    )
    .join("\n\n")
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as {
    workspace?: IdeationWorkspace
    ideationChat?: ChatMessage[]
    projectContext?: string
  }

  const workspace = body.workspace
  const chat = body.ideationChat ?? []
  const projectContext = body.projectContext?.trim() ?? ""

  if (!workspace?.ideas?.length) {
    return NextResponse.json(
      { error: "An ideas workspace is required before applying chat." },
      { status: 400 }
    )
  }
  if (!projectContext) {
    return NextResponse.json(
      { error: "Project context is required." },
      { status: 400 }
    )
  }
  if (chat.length < 2) {
    return NextResponse.json(
      { error: "Chat a bit with Scout first, then apply." },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  const runtimeKey = cookieStore.get("openai_key")?.value
  const apiKey = runtimeKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OpenAI API key not configured. Go to Settings to add your key.",
      },
      { status: 400 }
    )
  }

  const userContent = [
    `--- Project context ---\n${projectContext}`,
    `--- Current workspace JSON ---\n${JSON.stringify(workspace)}`,
    `--- Ideas tab chat (apply all relevant guidance) ---\n${chatTranscript(chat)}`,
    "\nReturn the full updated workspace JSON matching the schema. Preserve idea ids when editing existing ideas unless the chat explicitly replaces or removes them. Keep 4–6 distinct directions when possible. Update landscapeMarkdown or sourcesMarkdown only if the chat calls for it.",
  ].join("\n\n")

  const openai = createRouteOpenAI(apiKey)

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.35,
      max_tokens: 8000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ideation_workspace",
          strict: true,
          schema: IDEATION_WORKSPACE_JSON_SCHEMA as unknown as Record<
            string,
            unknown
          >,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You output only JSON for the Ideas workspace. No markdown fences, no commentary.",
        },
        { role: "user", content: userContent },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    if (!raw) {
      return NextResponse.json(
        { error: "Empty merge response from the model." },
        { status: 502 }
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON." },
        { status: 502 }
      )
    }

    const ideation = parseIdeationPayload(parsed)
    if (!ideation) {
      return NextResponse.json(
        { error: "Merged workspace failed validation." },
        { status: 502 }
      )
    }

    return NextResponse.json({ ideation })
  } catch (e) {
    return NextResponse.json(
      { error: openAiFailureMessage(e) },
      { status: 502 }
    )
  }
}
