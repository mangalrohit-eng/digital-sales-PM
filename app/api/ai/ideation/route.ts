import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import {
  createRouteOpenAI,
  openAiFailureMessage,
} from "@/lib/openai-route-helpers"
import { cookies } from "next/headers"
import { parseIdeationPayload } from "@/lib/ideation-payload"
import { IDEATION_WORKSPACE_JSON_SCHEMA } from "@/lib/ideation-workspace-json-schema"

export const maxDuration = 120

const IDEATION_JSON_SCHEMA = IDEATION_WORKSPACE_JSON_SCHEMA

const INSTRUCTIONS_BASE = `You are a product strategy assistant for a PM on Spectrum.com digital sales (cable/broadband: plans, eligibility, cart, checkout, disclosures).

Use the hosted web search tool to research:
- Competitors and adjacent providers (category-level patterns, not fabricated dollar pricing)
- E-commerce / telecom checkout and pricing-transparency best practices
- Published UX and conversion guidance where relevant

Then produce structured output per the JSON schema you must follow.

Each idea in "ideas" must be a distinct initiative direction (e.g. navigation & IA, pricing disclosure, cart/checkout flow, trust & social proof, progressive profiling). Include 4–6 ideas with concrete detailMarkdown (markdown body) and researchBasis tying to what you found online.

landscapeMarkdown: markdown sections such as ## Competitive / category patterns, ## Best practices, ## Risks to watch — grounded in search.

sourcesMarkdown: markdown list of URLs or article titles you used.

problemRestatement: one tight paragraph in the PM's vocabulary from their context.`

const INSTRUCTIONS_JSON_ONLY = `${INSTRUCTIONS_BASE}

Output: respond with ONLY a single valid JSON object (no markdown fences, no commentary) matching the required schema keys exactly.`

function extractJsonObject(text: string): unknown | null {
  const t = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  const candidate = fence ? fence[1].trim() : t
  try {
    return JSON.parse(candidate) as unknown
  } catch {
    const start = candidate.indexOf("{")
    const end = candidate.lastIndexOf("}")
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as unknown
      } catch {
        return null
      }
    }
    return null
  }
}

/** Prefer API-parsed structured output, then parse raw text. */
function ideationFromModelOutput(
  outputText: string,
  outputParsed: unknown | null | undefined
): ReturnType<typeof parseIdeationPayload> {
  if (outputParsed != null) {
    const fromParsed = parseIdeationPayload(outputParsed)
    if (fromParsed) return fromParsed
  }
  const extracted = extractJsonObject(outputText)
  return parseIdeationPayload(extracted)
}

function responseLooksTruncated(response: {
  incomplete_details?: { reason?: string } | null
}): boolean {
  return response.incomplete_details?.reason === "max_output_tokens"
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as {
    projectContext?: string
    ideationChatTranscript?: string
  }
  const projectContext = body.projectContext?.trim() ?? ""
  if (!projectContext) {
    return NextResponse.json(
      { error: "Project context is required." },
      { status: 400 }
    )
  }
  const chatExtra = body.ideationChatTranscript?.trim()

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

  const userInput = [
    `--- Project context (ground truth) ---\n${projectContext}`,
    chatExtra
      ? `--- Ideas tab chat (apply relevant guidance when generating) ---\n${chatExtra}`
      : null,
    "\nTask: Search the web as needed, then fill the JSON object. Ideas must be mutually distinct solution paths the PM could charter.",
  ]
    .filter(Boolean)
    .join("\n\n")

  const openai = createRouteOpenAI(apiKey)

  const schemaFormat = {
    type: "json_schema" as const,
    name: "ideation_workspace",
    strict: true,
    schema: IDEATION_JSON_SCHEMA as unknown as Record<string, unknown>,
  }

  /** Plain-text JSON fallback (no schema) when structured parse paths fail. */
  async function runWithTool(toolType: "web_search_preview" | "web_search") {
    return openai.responses.create({
      model: "gpt-4o",
      instructions: INSTRUCTIONS_JSON_ONLY,
      input: userInput,
      tools:
        toolType === "web_search"
          ? [{ type: "web_search" as const }]
          : [{ type: "web_search_preview" as const }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      max_output_tokens: 16_000,
      temperature: 0.35,
    })
  }

  /**
   * `responses.parse` attaches `output_parsed` for json_schema — more reliable than
   * parsing `output_text` alone (avoids fence/preamble edge cases in prod).
   */
  async function runParseWithTool(toolType: "web_search_preview" | "web_search") {
    return openai.responses.parse({
      model: "gpt-4o",
      instructions: INSTRUCTIONS_BASE,
      input: userInput,
      tools:
        toolType === "web_search"
          ? [{ type: "web_search" as const }]
          : [{ type: "web_search_preview" as const }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      max_output_tokens: 16_000,
      temperature: 0.35,
      text: {
        format: schemaFormat,
      },
    })
  }

  async function executeIdeationRequest(): Promise<
    NonNullable<ReturnType<typeof parseIdeationPayload>>
  > {
    let lastErr: unknown

    for (const tool of ["web_search_preview", "web_search"] as const) {
      try {
        const response = await runParseWithTool(tool)
        if (response.error) {
          throw new Error(
            response.error.message?.trim() || "Model response error"
          )
        }
        if (responseLooksTruncated(response)) {
          continue
        }
        const text = response.output_text?.trim() ?? ""
        const op = (
          response as { output_parsed?: unknown }
        ).output_parsed
        const ideation = ideationFromModelOutput(text, op)
        if (ideation) return ideation
      } catch (e) {
        lastErr = e
      }
    }

    for (const tool of ["web_search_preview", "web_search"] as const) {
      try {
        const response = await runWithTool(tool)
        if (response.error) {
          throw new Error(
            response.error.message?.trim() || "Model response error"
          )
        }
        if (responseLooksTruncated(response)) {
          continue
        }
        const text = response.output_text?.trim() ?? ""
        if (!text) continue
        const ideation = ideationFromModelOutput(text, null)
        if (ideation) return ideation
      } catch (e) {
        lastErr = e
      }
    }

    if (lastErr instanceof Error) throw lastErr
    throw new Error(
      openAiFailureMessage(lastErr) ||
        "The model returned no usable ideation. Try again or shorten context."
    )
  }

  try {
    const ideation = await executeIdeationRequest()
    return NextResponse.json({ ideation })
  } catch (e) {
    return NextResponse.json(
      { error: openAiFailureMessage(e) },
      { status: 502 }
    )
  }
}
