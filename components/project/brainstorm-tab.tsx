"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  User,
  Copy,
  Check,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { ChatMessage } from "@/lib/types"
import { toast } from "sonner"

interface BrainstormTabProps {
  projectId: string
  projectName: string
  croContext: string
  userName: string
}

const QUICK_PROMPTS = [
  "What are the top CRO opportunities for the checkout flow?",
  "Brainstorm ideas to reduce cart abandonment",
  "Suggest A/B tests for the address verification step",
  "How can we improve mobile conversion rates?",
  "What personalization strategies could boost conversions?",
]

function MessageBubble({
  message,
  userName,
}: {
  message: ChatMessage
  userName: string
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const copyContent = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        <AvatarFallback
          className={`text-xs font-semibold ${
            isUser ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={`group relative max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-white rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          }`}
        >
          {message.content}
        </div>
        {!isUser && (
          <button
            onClick={copyContent}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  )
}

export function BrainstormTab({
  projectId,
  projectName,
  croContext,
  userName,
}: BrainstormTabProps) {
  const { getProject, appendChatMessage, clearProjectChat } = useAppStore()
  const project = getProject(projectId)
  const messages = project?.chatHistory ?? []

  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return

    const userMessage: ChatMessage = { role: "user", content: content.trim() }
    appendChatMessage(projectId, userMessage)
    setInput("")
    setStreaming(true)
    setStreamingText("")

    try {
      const res = await fetch("/api/ai/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          projectContext: croContext
            ? `Initiative: ${projectName}\n${croContext}`
            : `Initiative: ${projectName}`,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }))
        throw new Error(data.error ?? "Request failed")
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setStreamingText(fullText)
        }
      }

      appendChatMessage(projectId, { role: "assistant", content: fullText })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      toast.error(msg)
    } finally {
      setStreaming(false)
      setStreamingText("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] bg-background rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Brainstorm</p>
            <p className="text-xs text-muted-foreground">
              Spectrum.com CRO specialist
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={() => {
              clearProjectChat(projectId)
              toast.success("Conversation cleared")
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        <div className="space-y-5">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Start brainstorming</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Ask me anything about CRO opportunities for Spectrum.com. I&apos;ll
                help you generate ideas, identify friction points, and build
                your hypothesis.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-xs px-3 py-2 rounded-full border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} userName={userName} />
          ))}

          {streaming && streamingText && (
            <div className="flex gap-3">
              <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-muted text-sm leading-relaxed whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-1 h-4 bg-primary/60 ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          )}

          {streaming && !streamingText && (
            <div className="flex gap-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-5 py-4 border-t border-border bg-background shrink-0">
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-thin">
            {QUICK_PROMPTS.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={streaming}
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-accent disabled:opacity-40 transition-all text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about CRO opportunities... (Enter to send, Shift+Enter for new line)"
            className="resize-none min-h-[44px] max-h-[120px] text-sm"
            rows={1}
            disabled={streaming}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Context-aware responses tailored to Spectrum.com&apos;s digital sales funnel
        </p>
      </div>
    </div>
  )
}
