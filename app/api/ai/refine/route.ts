import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ArtifactType } from "@/lib/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body: {
    title: string
    type: ArtifactType
    content: string
    feedback: string
  } = await req.json()

  const { title, type, content, feedback } = body
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

  const typeLabel =
    type === "brd"
      ? "Business Requirements Document"
      : type === "epic"
        ? "Epic"
        : type === "story"
          ? "User Story"
          : "Test Case"

  const prompt = `You are a senior product and engineering writer for Spectrum.com (Charter Communications digital sales / CRO).

The user has an existing ${typeLabel} titled: "${title}"

CURRENT ARTIFACT (markdown):
---
${content}
---

USER FEEDBACK TO INCORPORATE:
${feedback}

Rewrite the full artifact in clean markdown. Apply the feedback thoroughly while keeping the same general document structure and headings where sensible. Do not add a preamble—output only the revised markdown body.`

  const openai = new OpenAI({ apiKey })
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 4000,
  })

  const refined = completion.choices[0].message.content ?? ""
  return NextResponse.json({ content: refined })
}
