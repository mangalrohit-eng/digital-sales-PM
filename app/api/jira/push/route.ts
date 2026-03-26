import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const JIRA_PROJECT_KEY = "SPEC"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { artifactIds }: { artifactIds: string[] } = await req.json()

  // Simulate realistic network latency
  await new Promise((resolve) => setTimeout(resolve, 800))

  let ticketCounter = 1042 + Math.floor(Math.random() * 100)

  const tickets = artifactIds.map((artifactId) => ({
    artifactId,
    ticketId: `${JIRA_PROJECT_KEY}-${ticketCounter++}`,
    url: `https://example.atlassian.net/browse/${JIRA_PROJECT_KEY}-${ticketCounter - 1}`,
    status: "To Do",
    createdAt: new Date().toISOString(),
  }))

  return NextResponse.json({
    success: true,
    tickets,
    message: `Successfully created ${tickets.length} Jira ticket${tickets.length !== 1 ? "s" : ""}.`,
  })
}
