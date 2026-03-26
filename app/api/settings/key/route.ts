import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const { key }: { key: string } = await req.json()
  const cookieStore = await cookies()

  if (key && key.trim()) {
    cookieStore.set("openai_key", key.trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })
  } else {
    cookieStore.delete("openai_key")
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const cookieStore = await cookies()
  const cookieKey = cookieStore.get("openai_key")?.value
  const hasEnvKey = !!process.env.OPENAI_API_KEY
  const hasCookieKey = !!cookieKey

  return NextResponse.json({
    configured: hasEnvKey || hasCookieKey,
    source: hasEnvKey ? "env" : hasCookieKey ? "session" : "none",
  })
}
