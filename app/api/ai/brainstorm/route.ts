import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest } from "next/server"
import { cookies } from "next/headers"

const SYSTEM_PROMPT = `You are an expert digital product strategist and CRO (Conversion Rate Optimization) specialist for Spectrum.com, Charter Communications' primary digital sales platform.

Your expertise includes:
- Conversion rate optimization for internet, TV, cable, and phone service subscriptions
- UX/UI best practices for telecom e-commerce
- A/B testing strategies and experimentation frameworks
- Customer journey mapping for digital sales funnels
- Reducing cart abandonment and improving checkout flows
- Personalization strategies for different customer segments

When brainstorming, consider:
- Spectrum.com's primary goal: converting visitors into paying subscribers
- Customer segments: new customers, existing customers upgrading, movers
- Key pages: homepage, product pages, address checker, cart, checkout
- Common friction points: pricing confusion, product complexity, trust gaps
- Competitor context: Xfinity, AT&T, Frontier, T-Mobile Home Internet

Provide specific, actionable ideas grounded in CRO best practices. Be concise and structured in your responses.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, projectContext } = await req.json()

  const cookieStore = await cookies()
  const runtimeKey = cookieStore.get("openai_key")?.value
  const apiKey = runtimeKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured. Go to Settings to add your key." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const openai = new OpenAI({ apiKey })

  const systemContent = projectContext
    ? `${SYSTEM_PROMPT}\n\nCurrent project context: ${projectContext}`
    : SYSTEM_PROMPT

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [{ role: "system", content: systemContent }, ...messages],
    temperature: 0.8,
    max_tokens: 1500,
  })

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
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
