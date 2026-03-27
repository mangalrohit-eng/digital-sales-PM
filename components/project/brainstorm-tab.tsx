"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  User,
  FileText,
  CheckCircle2,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { ChatMessage } from "@/lib/types"
import { AGENT_SAGE, agentInitials } from "@/lib/agents"
import { toast } from "sonner"
import { renderMarkdown } from "@/lib/markdown-html"

interface BrainstormTabProps {
  projectId: string
  projectName: string
  croContext: string
  userName: string
}

/** Short chip label + full message (initiative-specific). */
function initiativeQuickActions(p: {
  projectName: string
  description: string
  croContext: string
}): { label: string; prompt: string }[] {
  const name = p.projectName.trim() || "this initiative"
  const desc = p.description.trim()
  const ctx = p.croContext.trim()
  const descQuoted = desc.length > 280 ? `${desc.slice(0, 277)}…` : desc
  const ctxQuoted = ctx.length > 280 ? `${ctx.slice(0, 277)}…` : ctx

  const actions: { label: string; prompt: string }[] = []

  actions.push({
    label: "Top opportunities",
    prompt: `For the initiative "${name}": What are the top 3 opportunities we should prioritize first, what evidence supports each, and what should we explicitly deprioritize?`,
  })

  if (desc) {
    actions.push({
      label: "Stress-test description",
      prompt: `Initiative: "${name}"\n\nCurrent description:\n${descQuoted}\n\nWhat is unclear, missing, or risky? What should we rewrite or validate before we commit design and engineering?`,
    })
  } else {
    actions.push({
      label: "Draft description",
      prompt: `"${name}" does not have a written description yet. Draft a tight one-paragraph initiative description (problem, audience, outcome, and how we will measure success) that we can align the team on.`,
    })
  }

  if (ctx) {
    actions.push({
      label: "Mine context",
      prompt: `Initiative: "${name}"\n\nProduct / funnel / business context:\n${ctxQuoted}\n\nGiven this context, what friction points, constraints, or dependencies should we brainstorm—and what mitigations or experiments should we consider?`,
    })
  } else {
    actions.push({
      label: "Hidden assumptions",
      prompt: `For "${name}", what implicit assumptions might we be making (users, channels, compliance, data, tech)? Which should we validate first and how?`,
    })
  }

  actions.push({
    label: "Phased roadmap",
    prompt: `Propose a phased roadmap (discovery → design → build → launch → measure) specifically for "${name}", with PM-level milestones and decision checkpoints.`,
  })

  actions.push({
    label: "Open questions",
    prompt: `List the highest-signal open questions for "${name}", grouped for design, engineering, analytics, and legal/compliance. For each, suggest who should own it and what “resolved” looks like.`,
  })

  return actions
}

function MessageBubble({
  message,
  userName,
}: {
  message: ChatMessage
  userName: string
}) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        <AvatarFallback
          className={`text-[10px] font-bold tracking-tight ${
            isUser ? "bg-primary text-white" : "bg-primary/15 text-primary"
          }`}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5" />
          ) : (
            agentInitials(AGENT_SAGE)
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={`relative max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        {!isUser && (
          <span className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary/90">
            {AGENT_SAGE.name} · {AGENT_SAGE.role}
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-white rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          }`}
        >
          {message.content}
        </div>
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
  const {
    getProject,
    appendChatMessage,
    clearProjectChat,
    updateProject,
    addArtifact,
    updateArtifact,
  } = useAppStore()
  const allArtifacts = useAppStore((s) => s.artifacts)
  const project = getProject(projectId)
  const messages = project?.chatHistory ?? []
  const description = project?.description?.trim() ?? ""

  const briefArtifact = useMemo(
    () =>
      allArtifacts.find(
        (a) => a.projectId === projectId && a.type === "initiative_brief"
      ),
    [allArtifacts, projectId]
  )

  const initiativeBriefText = useMemo(
    () =>
      briefArtifact?.content?.trim() ||
      project?.initiativeBrief?.trim() ||
      "",
    [briefArtifact?.content, project?.initiativeBrief]
  )

  useEffect(() => {
    const p = useAppStore.getState().getProject(projectId)
    const hasArtifact = useAppStore
      .getState()
      .artifacts.some(
        (a) => a.projectId === projectId && a.type === "initiative_brief"
      )
    if (hasArtifact) return
    const legacy = p?.initiativeBrief?.trim()
    if (!legacy) return
    useAppStore.getState().addArtifact({
      projectId,
      parentId: null,
      type: "initiative_brief",
      title: `Initiative brief: ${p?.name?.trim() || "Initiative"}`,
      content: legacy,
      status: "draft",
      published: false,
    })
    useAppStore.getState().updateProject(projectId, { initiativeBrief: "" })
  }, [projectId])

  const projectContextForApi = useMemo(() => {
    const lines = [`Initiative: ${projectName.trim() || "(unnamed)"}`]
    if (description) {
      lines.push(`Description:\n${description}`)
    } else {
      lines.push("Description: (not provided yet—offer to help draft one if useful)")
    }
    if (croContext.trim()) {
      lines.push(`Product / funnel context:\n${croContext.trim()}`)
    }
    return lines.join("\n\n")
  }, [projectName, description, croContext])

  const quickActions = useMemo(
    () =>
      initiativeQuickActions({
        projectName,
        description,
        croContext,
      }),
    [projectName, description, croContext]
  )

  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [briefRefreshing, setBriefRefreshing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  /** When false, user scrolled up — do not fight them during streaming / new tokens. */
  const stickToBottomRef = useRef(true)
  const messagesScrollRegionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = messagesScrollRegionRef.current
    if (!wrap) return
    const viewport = wrap.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null
    if (!viewport) return

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport
      const fromBottom = scrollHeight - scrollTop - clientHeight
      stickToBottomRef.current = fromBottom < 72
    }

    viewport.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => viewport.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!stickToBottomRef.current) return
    bottomRef.current?.scrollIntoView({
      behavior: streamingText ? "auto" : "smooth",
    })
  }, [messages, streamingText])

  const refreshInitiativeBrief = useCallback(
    async (chatMessages: ChatMessage[]) => {
      if (chatMessages.length === 0) {
        const existing = useAppStore
          .getState()
          .artifacts.find(
            (a) => a.projectId === projectId && a.type === "initiative_brief"
          )
        if (existing) {
          updateArtifact(existing.id, { content: "" })
        }
        updateProject(projectId, { initiativeBrief: "" })
        return
      }

      const state = useAppStore.getState()
      const existing = state.artifacts.find(
        (a) => a.projectId === projectId && a.type === "initiative_brief"
      )
      const prev =
        existing?.content?.trim() ??
        state.getProject(projectId)?.initiativeBrief?.trim() ??
        ""

      setBriefRefreshing(true)
      try {
        const res = await fetch("/api/ai/initiative-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatMessages,
            projectContext: projectContextForApi,
            previousBrief: prev,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error ?? "Could not update initiative brief")
        }
        const brief = typeof data.brief === "string" ? data.brief.trim() : ""
        if (brief) {
          if (existing) {
            updateArtifact(existing.id, { content: brief })
          } else {
            addArtifact({
              projectId,
              parentId: null,
              type: "initiative_brief",
              title: `Initiative brief: ${projectName.trim() || "Initiative"}`,
              content: brief,
              status: "draft",
              published: false,
            })
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Brief update failed"
        toast.error(msg)
      } finally {
        setBriefRefreshing(false)
      }
    },
    [
      projectId,
      projectContextForApi,
      projectName,
      updateProject,
      updateArtifact,
      addArtifact,
    ]
  )

  useEffect(() => {
    const p = useAppStore.getState().getProject(projectId)
    const hist = p?.chatHistory ?? []
    if (hist.length === 0) return
    const arts = useAppStore
      .getState()
      .artifacts.filter((a) => a.projectId === projectId)
    const hasBrief = arts.some(
      (a) => a.type === "initiative_brief" && a.content?.trim()
    )
    if (hasBrief || p?.initiativeBrief?.trim()) return
    void refreshInitiativeBrief(hist)
  }, [projectId, refreshInitiativeBrief])

  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return

    stickToBottomRef.current = true

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
          projectContext: projectContextForApi,
          agentPrompts: useAppStore.getState().agentPrompts,
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
      const nextHistory: ChatMessage[] = [
        ...messages,
        userMessage,
        { role: "assistant", content: fullText },
      ]
      void refreshInitiativeBrief(nextHistory)
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

  const briefPublished = briefArtifact?.published === true

  const finalizeBrief = () => {
    const text = initiativeBriefText.trim()
    if (!text) return

    const existing = useAppStore
      .getState()
      .artifacts.find(
        (a) => a.projectId === projectId && a.type === "initiative_brief"
      )

    if (existing?.published) return

    if (!existing) {
      addArtifact({
        projectId,
        parentId: null,
        type: "initiative_brief",
        title: `Initiative brief: ${projectName.trim() || "Initiative"}`,
        content: text,
        status: "draft",
        published: true,
      })
    } else {
      const updates: { published: true; content?: string } = { published: true }
      if (!existing.content?.trim()) updates.content = text
      updateArtifact(existing.id, updates)
    }

    const p = useAppStore.getState().getProject(projectId)
    if (p?.initiativeBrief?.trim()) {
      updateProject(projectId, { initiativeBrief: "" })
    }

    toast.success(
      "Added to Artifacts — you can continue review and approval there."
    )
  }

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-6xl min-w-0 flex-1 grid-cols-1 gap-4 overflow-hidden [grid-template-rows:minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-12 lg:grid-rows-1 lg:gap-4">
      {/* Left: chat — composer fixed at bottom of column; messages scroll */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background lg:col-span-4">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 shrink-0">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chat
            </span>
            <p className="text-[11px] text-muted-foreground truncate max-w-[min(100%,14rem)] sm:max-w-md">
              {AGENT_SAGE.name} · {projectName}
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
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

        <div
          ref={messagesScrollRegionRef}
          className="flex min-h-0 flex-1 flex-col"
        >
      <ScrollArea className="min-h-0 min-w-0 flex-1 px-4 py-4">
        <div className="space-y-5">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                Discovery ·{" "}
                <span className="text-primary">{projectName}</span>
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
                Quick prompts use this initiative&apos;s name
                {description ? ", description" : ""}
                {croContext.trim() ? ", and saved context" : ""}. Choose one or
                write your own, then open BRD or the next workspace tab when you are ready.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-full">
                {quickActions.map(({ label, prompt }, idx) => (
                  <button
                    key={`${label}-${idx}`}
                    type="button"
                    title={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-xs px-3 py-2 rounded-full border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground max-w-[100%] text-left sm:text-center"
                  >
                    {label}
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
                <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                  {agentInitials(AGENT_SAGE)}
                </AvatarFallback>
              </Avatar>
              <div className="flex max-w-[80%] flex-col">
                <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/90">
                  {AGENT_SAGE.name} · responding
                </span>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-1 h-4 bg-primary/60 ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            </div>
          )}

          {streaming && !streamingText && (
            <div className="flex gap-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                  {agentInitials(AGENT_SAGE)}
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground/80">
                  {AGENT_SAGE.name} is thinking…
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-thin">
            {quickActions.slice(0, 3).map(({ label, prompt }, idx) => (
              <button
                key={`bar-${label}-${idx}`}
                type="button"
                title={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={streaming}
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-accent disabled:opacity-40 transition-all text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {label}
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
            placeholder={`Ask about "${projectName}"… (Enter to send, Shift+Enter for new line)`}
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
          Each message includes this initiative&apos;s name, description, and
          saved context. The brief on the right updates after each Sage reply.
          Use Finalize in the preview header when it is ready to add it to
          Artifacts; then approve and export to Confluence. BRD generation uses
          the latest brief content.
        </p>
      </div>
      </div>

      {/* Right: initiative brief (mirrors Stories “Preview” column) */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background lg:col-span-8">
        <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 max-w-full flex-1 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </span>
                  <span className="truncate text-xs font-medium text-foreground/90">
                    Initiative brief
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  Discovery · BRD input
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {briefRefreshing && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating
                </span>
              )}
              {initiativeBriefText.trim() && !briefRefreshing && (
                <>
                  {briefPublished ? (
                    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={2}
                      />
                      Finalized
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] leading-none"
                    >
                      Draft
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <ScrollArea className="min-h-0 min-w-0 flex-1 px-4 py-3">
          {!initiativeBriefText && !briefRefreshing && messages.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Chat with {AGENT_SAGE.name} to build a concise brief. It refreshes
              after each reply with structured problem, audience, success
              signals, and open questions—ready to finalize and for the BRD step.
            </p>
          ) : !initiativeBriefText && briefRefreshing ? (
            <p className="text-sm text-muted-foreground">Drafting brief…</p>
          ) : initiativeBriefText ? (
            <div
              className="artifact-content artifact-preview text-sm"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(initiativeBriefText),
              }}
            />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your brief will appear here after you chat with {AGENT_SAGE.name}.
            </p>
          )}
        </ScrollArea>
        {initiativeBriefText.trim() && !briefRefreshing && !briefPublished && (
          <div className="shrink-0 space-y-2 border-t border-border bg-muted/15 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-12 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm"
              onClick={finalizeBrief}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
              Finalize to library
            </Button>
            <p className="text-center text-[11px] text-muted-foreground sm:text-left">
              Same as BRD: adds this brief to Artifacts for review, approval, and
              Confluence export. BRD generation uses the latest brief content.
            </p>
          </div>
        )}
        {initiativeBriefText.trim() && !briefRefreshing && briefPublished && (
          <div className="shrink-0 border-t border-border bg-muted/10 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-[11px] text-muted-foreground">
              This brief is in the Artifacts library. Open the Artifacts tab to
              review, approve, or export to Confluence.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
