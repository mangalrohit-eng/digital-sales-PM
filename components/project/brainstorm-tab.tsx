"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Clock,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import type { ChatMessage } from "@/lib/types"
import { PROJECT_STATUS_LABELS } from "@/lib/types"
import { AGENT_SAGE } from "@/lib/agents"
import { toast } from "sonner"
import { renderMarkdown } from "@/lib/markdown-html"
import { formatShortRelativePast } from "@/lib/date-utils"
import { useWorkbenchAgentBusy } from "@/components/project/workbench-agent-busy-context"
import {
  buildInitiativeBriefGenerateDetail,
  buildInitiativeBriefRefineDetail,
} from "@/lib/workbench-agent-activity-builders"
import {
  fetchInitiativeBriefStream,
  fetchRefineStream,
  settleBeforeArtifact,
} from "@/lib/ai-stream-client"

interface BrainstormTabProps {
  projectId: string
  projectName: string
  croContext: string
  userName: string
}

const DISCOVERY_DESCRIPTION =
  "Generate a concise initiative brief from context. Refine it in chat, then finalize to the Artifacts library for BRD and downstream steps."

function WorkspaceChatRefinedAge({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatShortRelativePast(iso))
  useEffect(() => {
    const tick = () => setLabel(formatShortRelativePast(iso))
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [iso])
  return <span className="tabular-nums">{label}</span>
}

function buildRefineFeedback(
  latestUserMessage: string,
  priorChat: ChatMessage[]
): string {
  const recent = [...priorChat, { role: "user" as const, content: latestUserMessage }]
  const transcript = recent
    .slice(-12)
    .map((m) =>
      m.role === "user" ? `User: ${m.content}` : `Assistant: ${m.content}`
    )
    .join("\n")
  return `Conversation (most recent last):\n${transcript}\n\nApply the latest user instruction to the full artifact. Preserve structure unless asked to change it.`
}

export function BrainstormTab({
  projectId,
  projectName,
  croContext,
  userName,
}: BrainstormTabProps) {
  const {
    begin: beginAgentBusy,
    end: endAgentBusy,
    patchActiveDetail,
  } = useWorkbenchAgentBusy()
  const { getProject, updateProject, updateArtifact } = useAppStore()
  const allArtifacts = useAppStore((s) => s.artifacts)

  const project = getProject(projectId)
  const description = project?.description?.trim() ?? ""

  const workspaceItems = useMemo(
    () =>
      allArtifacts.filter(
        (a) => a.projectId === projectId && a.type === "initiative_brief"
      ),
    [allArtifacts, projectId]
  )

  /** Any initiative_brief row in the store (including empty drafts). */
  const hasAnyBriefArtifact = workspaceItems.length > 0
  const hasWorkspaceContent = useMemo(
    () => workspaceItems.some((a) => a.content?.trim()),
    [workspaceItems]
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = workspaceItems.find((a) => a.id === selectedId) ?? null

  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [chatInput, setChatInput] = useState("")
  const [refining, setRefining] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (workspaceItems.length === 0) {
      setSelectedId(null)
      return
    }
    const withContent = workspaceItems.filter((a) => a.content?.trim())
    const preferred =
      withContent.find((a) => !a.published) ??
      withContent[0] ??
      workspaceItems[0]
    if (!selectedId || !workspaceItems.some((a) => a.id === selectedId)) {
      setSelectedId(preferred.id)
    }
  }, [workspaceItems, selectedId])

  const projectContextForApi = useMemo(() => {
    const lines = [`Initiative: ${projectName.trim() || "(unnamed)"}`]
    if (project) {
      lines.push(`Status: ${PROJECT_STATUS_LABELS[project.status]}`)
      const role = project.ownerRole?.trim()
      lines.push(
        role
          ? `Owner: ${project.owner} (${role})`
          : `Owner: ${project.owner}`
      )
    }
    if (description) {
      lines.push(`Description:\n${description}`)
    } else {
      lines.push(
        "Description: (none on file—infer a working problem statement from the initiative name and product context; note assumptions under Open questions)"
      )
    }
    if (croContext.trim()) {
      lines.push(`Product / funnel context:\n${croContext.trim()}`)
    } else {
      lines.push(
        "Product / funnel context: (none on file—infer typical Spectrum.com digital sales scope only where helpful; list confirmations under Open questions)"
      )
    }
    const hist = project?.chatHistory?.filter((m) => m.content?.trim()) ?? []
    if (hist.length > 0) {
      const tail = hist.slice(-16)
      lines.push(
        `Prior initiative chat (most recent last):\n${tail
          .map((m) =>
            m.role === "user"
              ? `PM: ${m.content.trim()}`
              : `Assistant: ${m.content.trim()}`
          )
          .join("\n")}`
      )
    }
    return lines.join("\n\n")
  }, [projectName, description, croContext, project])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selected?.workspaceChat?.length, refining, selected?.id])

  const runGenerate = useCallback(async () => {
    setGenerating(true)
    setGenProgress(0)
    beginAgentBusy(
      buildInitiativeBriefGenerateDetail({
        projectName,
        description,
        croContext,
        contextBlockChars: projectContextForApi.length,
      })
    )
    const tick = setInterval(() => {
      setGenProgress((p) => (p < 88 ? p + 9 : p))
    }, 280)
    try {
      const data = await fetchInitiativeBriefStream(
        {
          messages: [],
          projectContext: projectContextForApi,
          previousBrief: "",
        },
        (preview) => {
          const t = preview.trim()
          if (t) patchActiveDetail({ planning: t })
        },
        { projectContext: projectContextForApi, transcript: "" }
      )
      const brief = data.brief.trim()
      if (!brief) throw new Error("Empty brief response")
      await settleBeforeArtifact()

      const state = useAppStore.getState()
      const items = state.artifacts.filter(
        (a) => a.projectId === projectId && a.type === "initiative_brief"
      )
      const selId = selectedId
      const sel = selId ? items.find((a) => a.id === selId) : null

      if (sel && !sel.published) {
        state.updateArtifact(sel.id, {
          content: brief,
          workspaceChat: [],
          workspaceChatRefinedAt: undefined,
        })
      } else if (sel?.published) {
        const created = state.addArtifact({
          projectId,
          parentId: null,
          type: "initiative_brief",
          title: `Initiative brief: ${projectName.trim() || "Initiative"}`,
          content: brief,
          status: "draft",
          published: false,
        })
        setSelectedId(created.id)
      } else {
        const draft = items.find((a) => !a.published)
        if (draft) {
          state.updateArtifact(draft.id, {
            content: brief,
            workspaceChat: [],
            workspaceChatRefinedAt: undefined,
          })
          setSelectedId(draft.id)
        } else {
          const created = state.addArtifact({
            projectId,
            parentId: null,
            type: "initiative_brief",
            title: `Initiative brief: ${projectName.trim() || "Initiative"}`,
            content: brief,
            status: "draft",
            published: false,
          })
          setSelectedId(created.id)
        }
      }

      const p = state.getProject(projectId)
      if (p?.initiativeBrief?.trim()) {
        state.updateProject(projectId, { initiativeBrief: "" })
      }

      setGenProgress(100)
      toast.success("Brief draft is ready — refine in chat, then finalize.")
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Initiative brief generation failed"
      toast.error(msg)
    } finally {
      clearInterval(tick)
      endAgentBusy()
      setGenerating(false)
      setTimeout(() => setGenProgress(0), 600)
    }
  }, [
    beginAgentBusy,
    croContext,
    description,
    endAgentBusy,
    patchActiveDetail,
    projectContextForApi,
    projectId,
    projectName,
    selectedId,
  ])

  const sendChat = async () => {
    if (!selected || !chatInput.trim() || refining || selected.published) return
    const text = chatInput.trim()
    if (!selected.content?.trim()) return
    setChatInput("")
    const prior = selected.workspaceChat ?? []
    const feedback = buildRefineFeedback(text, prior)

    setRefining(true)
    beginAgentBusy(
      buildInitiativeBriefRefineDetail({
        title: selected.title,
        draftChars: selected.content?.trim().length ?? 0,
        instruction: text,
        workspaceChatTurns: prior.length,
      })
    )
    try {
      const data = await fetchRefineStream(
        {
          title: selected.title,
          type: selected.type,
          content: selected.content,
          feedback,
          agentPrompts: useAppStore.getState().agentPrompts,
        },
        (preview) => {
          const t = preview.trim()
          if (t) patchActiveDetail({ planning: t })
        }
      )
      const next = data.content
      if (!next?.trim()) throw new Error("Empty response")
      await settleBeforeArtifact()

      const userMsg: ChatMessage = { role: "user", content: text }
      const asstMsg: ChatMessage = {
        role: "assistant",
        content:
          "I updated the brief from your last message. Review the preview and send another instruction if needed.",
      }
      updateArtifact(selected.id, {
        content: next.trim(),
        workspaceChat: [...prior, userMsg, asstMsg],
        workspaceChatRefinedAt: new Date().toISOString(),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      endAgentBusy()
      setRefining(false)
    }
  }

  const finalizeBrief = () => {
    if (!selected?.content?.trim() || selected.published) return
    updateArtifact(selected.id, { published: true })
    const p = useAppStore.getState().getProject(projectId)
    if (p?.initiativeBrief?.trim()) {
      updateProject(projectId, { initiativeBrief: "" })
    }
    toast.success(
      "Added to Artifacts — you can continue review and approval there."
    )
  }

  const clearWorkspaceChat = () => {
    if (!selected || selected.published) return
    updateArtifact(selected.id, {
      workspaceChat: [],
      workspaceChatRefinedAt: undefined,
    })
    toast.success("Workspace chat cleared")
  }

  const generateLabel = hasWorkspaceContent
    ? "Regenerate initiative brief"
    : "Generate initiative brief"
  const generateLabelCompact = hasWorkspaceContent ? "Regenerate" : "Generate"

  const generateButtonCompact = (
    <Button
      type="button"
      onClick={() => void runGenerate()}
      disabled={generating}
      size="sm"
      variant="outline"
      title={generateLabel}
      className="h-7 shrink-0 gap-1 rounded-md border-border/80 px-2.5 text-[11px] font-semibold shadow-none sm:h-8 sm:px-3 sm:text-xs"
    >
      {generating ? (
        <>
          <Loader2 className="h-3 w-3 shrink-0 animate-spin sm:h-3.5 sm:w-3.5" />
          Generating…
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          {generateLabelCompact}
        </>
      )}
    </Button>
  )

  const generateButtonEmpty = (
    <Button
      type="button"
      onClick={() => void runGenerate()}
      disabled={generating}
      className="h-10 gap-2 rounded-lg px-5 text-sm font-semibold shadow-sm"
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} />
          {generateLabel}
        </>
      )}
    </Button>
  )

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight">Discovery</h2>
            <Badge
              variant="secondary"
              className="h-auto border-0 bg-primary/10 px-2 py-0 text-[10px] font-medium text-primary"
            >
              {AGENT_SAGE.name}
            </Badge>
            <Badge variant="outline" className="h-auto py-0 text-[10px]">
              {workspaceItems.length} in workspace
            </Badge>
          </div>
          {hasAnyBriefArtifact ? generateButtonCompact : null}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {DISCOVERY_DESCRIPTION}
        </p>
      </div>

      {generating && (
        <div className="shrink-0 space-y-1">
          <Progress value={genProgress} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground">
            This may take a few seconds…
          </p>
        </div>
      )}

      {!hasAnyBriefArtifact ? (
        <div className="workbench-pane-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto rounded-xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center sm:py-14">
          <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-1 font-medium">No initiative brief in this workspace</p>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Run generate to create a draft from your initiative context. It stays
            here until you finalize it to the Artifacts library.
          </p>
          {generateButtonEmpty}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden [grid-template-rows:minmax(0,1fr)_minmax(0,1.2fr)] lg:grid-cols-12 lg:grid-rows-1">
          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden lg:col-span-4">
            <div className="flex min-h-0 min-h-[10rem] flex-[1.15] flex-col overflow-hidden rounded-xl border border-border bg-background">
              <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chat
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-[10px] text-primary"
                    >
                      Live updates on
                    </Badge>
                    {(selected?.workspaceChat?.length ?? 0) > 0 &&
                      !selected?.published && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={clearWorkspaceChat}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Clear
                        </Button>
                      )}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {AGENT_SAGE.name} applies each message directly to this brief
                  draft.
                </p>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 p-3">
                  {selected?.published ? (
                    <p className="px-1 text-xs italic text-muted-foreground">
                      This brief is finalized. Use{" "}
                      <span className="font-medium not-italic text-foreground/80">
                        Regenerate
                      </span>{" "}
                      above to add a new draft in this workspace.
                    </p>
                  ) : (selected?.workspaceChat ?? []).length === 0 ? (
                    <p className="px-1 text-xs italic text-muted-foreground">
                      e.g. “Tighten success signals” or “Add risks for checkout
                      compliance.”
                    </p>
                  ) : null}
                  {(selected?.workspaceChat ?? []).map((m, i) => (
                    <div
                      key={`${i}-${m.role}`}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "ml-4 bg-primary/10"
                          : "mr-4 bg-muted"
                      }`}
                    >
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {m.role === "user" ? userName : "Assistant"}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  ))}
                  {refining && (
                    <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating brief…
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
              <div className="flex shrink-0 gap-2 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void sendChat()
                    }
                  }}
                  placeholder="Describe edits… (Enter to send, Shift+Enter for line)"
                  className="min-h-[44px] max-h-[100px] resize-none text-sm"
                  rows={2}
                  disabled={!selected || refining || selected?.published === true}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  disabled={
                    !selected ||
                    !chatInput.trim() ||
                    refining ||
                    selected?.published === true
                  }
                  onClick={() => void sendChat()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 min-h-[8rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-muted/20">
              <p className="shrink-0 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Initiative briefs in workspace
              </p>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1 p-2">
                  {workspaceItems.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedId === a.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 font-medium">{a.title}</span>
                        <Badge
                          variant={a.published ? "secondary" : "outline"}
                          className={`shrink-0 text-[10px] ${
                            a.published ? "bg-emerald-500/15 text-emerald-700" : ""
                          }`}
                        >
                          {a.published ? "Finalized" : "Draft"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background lg:col-span-8">
            <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-1.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </span>
                  {selected && (
                    <span
                      className="min-w-0 max-w-full truncate text-xs font-medium text-foreground/90 sm:max-w-[min(100%,18rem)] lg:max-w-[min(100%,28rem)]"
                      title={selected.title}
                    >
                      {selected.title}
                    </span>
                  )}
                  {selected?.workspaceChatRefinedAt ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] leading-none text-muted-foreground"
                      title={`Last updated from workspace chat: ${new Date(
                        selected.workspaceChatRefinedAt
                      ).toLocaleString()}`}
                    >
                      <Clock
                        className="h-3 w-3 shrink-0 text-primary/70"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>
                        Chat <WorkspaceChatRefinedAge iso={selected.workspaceChatRefinedAt} />
                      </span>
                    </span>
                  ) : null}
                </div>
                {selected && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {selected.published ? (
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={2}
                        />
                        Finalized
                      </span>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-[10px] leading-none">
                          Draft
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 shrink-0 gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                          onClick={finalizeBrief}
                          disabled={!selected.content?.trim()}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                          Finalize
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                {selected?.content?.trim() ? (
                  <div
                    className="artifact-content artifact-preview text-sm"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(selected.content),
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This draft is empty. Use{" "}
                    <span className="font-medium text-foreground/80">
                      {generateLabelCompact}
                    </span>{" "}
                    above to fill it from your Overview context, or pick another
                    brief in the list.
                  </p>
                )}
              </div>
            </ScrollArea>
            {selected?.published && (
              <div className="shrink-0 border-t border-border bg-muted/10 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <p className="text-[11px] text-muted-foreground">
                  This brief is in the Artifacts library. Open the Artifacts tab to
                  review, approve, or export to Confluence.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
