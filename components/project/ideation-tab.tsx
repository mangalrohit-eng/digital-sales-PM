"use client"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Sparkles,
  Copy,
  ArrowRight,
  FileInput,
  CheckCircle2,
  Target,
  Send,
  RotateCcw,
  PanelRightOpen,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { renderMarkdown } from "@/lib/markdown-html"
import { formatShortRelativePast } from "@/lib/date-utils"
import { useWorkbenchAgentBusy } from "@/components/project/workbench-agent-busy-context"
import {
  buildIdeationGenerateDetail,
  buildIdeationChatDetail,
  buildIdeationMergeDetail,
} from "@/lib/workbench-agent-activity-builders"
import {
  aiClientErrorMessage,
  fetchIdeation,
  fetchIdeationChatStream,
  fetchIdeationMerge,
} from "@/lib/ai-stream-client"
import { buildProjectContextForApi } from "@/lib/project-context-for-api"
import {
  mergeSelectedIdeationIntoCroContext,
  mergeIdeationIntoCroContext,
} from "@/lib/ideation-context-merge"
import type { ChatMessage, IdeationIdea, IdeationWorkspace } from "@/lib/types"
import { AGENT_SCOUT } from "@/lib/agents"

const IDEAS_DESCRIPTION =
  "Web research from Overview → refine with Scout → pick one idea → Brief."

function buildIdeationChatTranscript(chat: ChatMessage[]): string | undefined {
  if (!chat.length) return undefined
  return chat
    .slice(-24)
    .map((m) =>
      m.role === "user"
        ? `PM: ${m.content.trim()}`
        : `Scout: ${m.content.trim()}`
    )
    .join("\n\n")
}

function buildIdeasDigest(ws: IdeationWorkspace | undefined): string {
  if (!ws?.ideas?.length) return ""
  return ws.ideas
    .map((i) => `- **${i.id}**: ${i.title} — ${i.tagline}`)
    .join("\n")
}

interface IdeationTabProps {
  projectId: string
  projectName: string
  croContext: string
  userName: string
  onNavigate?: (tab: string) => void
}

export function IdeationTab({
  projectId,
  projectName,
  croContext,
  userName,
  onNavigate,
}: IdeationTabProps) {
  const { begin: beginAgentBusy, end: endAgentBusy } = useWorkbenchAgentBusy()
  const { getProject, updateProject } = useAppStore()
  const project = getProject(projectId)
  const description = project?.description?.trim() ?? ""

  const workspace = project?.ideation
  const ideationChat = project?.ideationChat ?? []
  const legacyReadout = project?.ideationReadout?.trim() ?? ""
  const hasStructured = Boolean(workspace?.ideas?.length)
  const hasWorkspace = hasStructured || Boolean(legacyReadout)
  const updatedAt = project?.ideationUpdatedAt
  const selectedId = project?.selectedIdeationId ?? null

  const selectedIdea: IdeationIdea | null = useMemo(() => {
    if (!workspace || !selectedId) return null
    return workspace.ideas.find((i) => i.id === selectedId) ?? null
  }, [workspace, selectedId])

  const projectContextForApi = useMemo(
    () => buildProjectContextForApi(project, projectName, croContext),
    [project, projectName, croContext]
  )

  const ideasDigest = useMemo(() => buildIdeasDigest(workspace), [workspace])

  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [chatInput, setChatInput] = useState("")
  const [chatBusy, setChatBusy] = useState(false)
  const [mergeBusy, setMergeBusy] = useState(false)
  const [streamPreview, setStreamPreview] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ideationChat.length, streamPreview, chatBusy])

  useEffect(() => {
    if (!workspace?.ideas?.length) return
    if (selectedId && workspace.ideas.some((i) => i.id === selectedId)) return
    updateProject(projectId, {
      selectedIdeationId: workspace.ideas[0]!.id,
    })
  }, [workspace, selectedId, projectId, updateProject])

  const selectIdea = useCallback(
    (id: string) => {
      updateProject(projectId, { selectedIdeationId: id })
    },
    [projectId, updateProject]
  )

  const runGenerate = useCallback(async () => {
    setGenerating(true)
    setGenProgress(0)
    beginAgentBusy(
      buildIdeationGenerateDetail({
        projectName,
        description,
        croContext,
        contextBlockChars: projectContextForApi.length,
      })
    )
    const tick = setInterval(() => {
      setGenProgress((p) => (p < 90 ? p + 5 : p))
    }, 450)
    try {
      const p = useAppStore.getState().getProject(projectId)
      const transcript = buildIdeationChatTranscript(p?.ideationChat ?? [])
      const { ideation } = await fetchIdeation({
        projectContext: projectContextForApi,
        ideationChatTranscript: transcript,
      })
      const firstId = ideation.ideas[0]?.id ?? null
      updateProject(projectId, {
        ideation,
        ideationUpdatedAt: new Date().toISOString(),
        selectedIdeationId: firstId,
        ideationReadout: undefined,
      })
      toast.success("Directions and research are ready.")
    } catch (err) {
      toast.error(aiClientErrorMessage(err))
    } finally {
      clearInterval(tick)
      endAgentBusy()
      setGenerating(false)
      setGenProgress(0)
    }
  }, [
    beginAgentBusy,
    croContext,
    description,
    endAgentBusy,
    projectContextForApi,
    projectId,
    projectName,
    updateProject,
  ])

  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatBusy) return
    setChatInput("")
    const state = useAppStore.getState()
    const p = state.getProject(projectId)
    const prior = p?.ideationChat ?? []
    const userMsg: ChatMessage = { role: "user", content: text }
    const messages: ChatMessage[] = [...prior, userMsg]
    state.updateProject(projectId, { ideationChat: messages })

    setChatBusy(true)
    setStreamPreview("")
    beginAgentBusy(
      buildIdeationChatDetail({
        turns: messages.length,
        digestChars: ideasDigest.length,
      })
    )
    try {
      const apiMsgs = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const full = await fetchIdeationChatStream(
        {
          messages: apiMsgs,
          projectContext: projectContextForApi,
          ideasDigest: ideasDigest || undefined,
          selectedIdeaId: selectedId,
          agentPrompts: state.agentPrompts,
        },
        (acc) => setStreamPreview(acc)
      )
      const trimmed = full.trim()
      if (!trimmed) throw new Error("Empty response")
      const asst: ChatMessage = { role: "assistant", content: trimmed }
      useAppStore.getState().updateProject(projectId, {
        ideationChat: [...messages, asst],
      })
    } catch (e) {
      toast.error(aiClientErrorMessage(e))
      useAppStore.getState().updateProject(projectId, {
        ideationChat: prior,
      })
    } finally {
      setStreamPreview("")
      setChatBusy(false)
      endAgentBusy()
    }
  }, [
    chatBusy,
    beginAgentBusy,
    endAgentBusy,
    ideasDigest,
    projectContextForApi,
    projectId,
    selectedId,
  ])

  const applyChatToWorkspace = useCallback(async () => {
    if (!workspace?.ideas?.length || ideationChat.length < 2 || mergeBusy) return
    setMergeBusy(true)
    beginAgentBusy(
      buildIdeationMergeDetail({
        ideaCount: workspace.ideas.length,
        chatTurns: ideationChat.length,
      })
    )
    try {
      const { ideation } = await fetchIdeationMerge({
        workspace,
        ideationChat,
        projectContext: projectContextForApi,
      })
      const still = ideation.ideas.some((i) => i.id === selectedId)
      const nextSelected = still
        ? selectedId
        : (ideation.ideas[0]?.id ?? null)
      updateProject(projectId, {
        ideation,
        ideationUpdatedAt: new Date().toISOString(),
        selectedIdeationId: nextSelected,
      })
      toast.success("Workspace updated from chat.")
    } catch (e) {
      toast.error(aiClientErrorMessage(e))
    } finally {
      setMergeBusy(false)
      endAgentBusy()
    }
  }, [
    beginAgentBusy,
    endAgentBusy,
    ideationChat,
    mergeBusy,
    projectContextForApi,
    projectId,
    selectedId,
    updateProject,
    workspace,
  ])

  const clearIdeationChat = useCallback(() => {
    if (chatBusy) return
    updateProject(projectId, { ideationChat: [] })
    toast.success("Ideas chat cleared")
  }, [chatBusy, projectId, updateProject])

  const copyPreview = useCallback(async () => {
    if (hasStructured && workspace && selectedIdea) {
      const blob = [
        workspace.problemRestatement,
        "",
        "## Research & best practices",
        workspace.landscapeMarkdown,
        "",
        `## ${selectedIdea.title}`,
        selectedIdea.tagline,
        "",
        selectedIdea.detailMarkdown,
        "",
        "## Sources",
        workspace.sourcesMarkdown,
      ].join("\n")
      try {
        await navigator.clipboard.writeText(blob)
        toast.success("Copied.")
      } catch {
        toast.error("Could not copy.")
      }
      return
    }
    if (legacyReadout) {
      try {
        await navigator.clipboard.writeText(legacyReadout)
        toast.success("Copied.")
      } catch {
        toast.error("Could not copy.")
      }
    }
  }, [hasStructured, workspace, selectedIdea, legacyReadout])

  const mergeIntoContext = useCallback(() => {
    if (hasStructured && workspace && selectedId) {
      const next = mergeSelectedIdeationIntoCroContext(
        croContext,
        workspace,
        selectedId
      )
      updateProject(projectId, { cro_context: next })
      toast.success("Appended selected idea to Additional thoughts.")
      return
    }
    if (legacyReadout) {
      const next = mergeIdeationIntoCroContext(croContext, legacyReadout)
      updateProject(projectId, { cro_context: next })
      toast.success("Appended readout to Additional thoughts.")
    }
  }, [
    croContext,
    hasStructured,
    legacyReadout,
    projectId,
    selectedId,
    updateProject,
    workspace,
  ])

  const generateButtonCompact = (
    <Button
      type="button"
      onClick={() => void runGenerate()}
      disabled={generating}
      size="sm"
      variant="outline"
      className="h-7 shrink-0 gap-1.5 rounded-md border-border/80 px-2.5 text-[11px] font-semibold shadow-none sm:h-8 sm:px-3 sm:text-xs"
    >
      {generating ? (
        <>
          <Loader2 className="h-3 w-3 shrink-0 animate-spin sm:h-3.5 sm:w-3.5" />
          Researching…
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          Regenerate
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
          Researching…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} />
          Research & generate ideas
        </>
      )}
    </Button>
  )

  const contextModal = (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-[11px] sm:h-8 sm:text-xs"
          >
            <PanelRightOpen className="h-3.5 w-3.5" strokeWidth={2} />
            What Scout sees
          </Button>
        }
      />
      <DialogContent className="max-h-[min(85vh,640px)] w-[calc(100%-1.5rem)] max-w-2xl gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold">
            Context sent to Scout
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-normal pt-1">
            Overview fields, project metadata, and the idea you select here.
          </p>
        </DialogHeader>
        <ScrollArea className="max-h-[min(60vh,480px)]">
          <pre className="whitespace-pre-wrap break-words p-5 text-xs leading-relaxed text-foreground/90">
            {projectContextForApi}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )

  const chatPanel = (
    <div className="flex min-h-0 min-h-[10rem] flex-[1.15] flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chat
            </span>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-[10px] text-primary"
            >
              {AGENT_SCOUT.name}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Live
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={!ideationChat.length || chatBusy}
              onClick={clearIdeationChat}
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={
                !hasStructured ||
                ideationChat.length < 2 ||
                mergeBusy ||
                chatBusy
              }
              onClick={() => void applyChatToWorkspace()}
            >
              {mergeBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              Apply chat to workspace
            </Button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Apply = merge chat into ideas (no search). Regenerate = new research.
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {ideationChat.length === 0 && !chatBusy ? (
            <p className="px-1 text-xs italic text-muted-foreground">
              e.g. new angle on checkout, or sharpen a tagline.
            </p>
          ) : null}
          {ideationChat.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={`rounded-xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-3 bg-primary/10"
                  : "mr-3 bg-muted"
              }`}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {m.role === "user" ? userName : AGENT_SCOUT.name}
              </p>
              <div
                className="artifact-content artifact-preview prose-p:my-1 text-[13px] leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(m.content),
                }}
              />
            </div>
          ))}
          {chatBusy && streamPreview ? (
            <div className="mr-3 rounded-xl bg-muted px-3 py-2 text-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {AGENT_SCOUT.name}
              </p>
              <div
                className="artifact-content artifact-preview prose-p:my-1 text-[13px] leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(streamPreview),
                }}
              />
            </div>
          ) : null}
          {chatBusy && !streamPreview ? (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scout is thinking…
            </div>
          ) : null}
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
          placeholder="Message Scout… (Enter to send)"
          className="min-h-[44px] max-h-[100px] resize-none text-sm"
          rows={2}
          disabled={chatBusy}
        />
        <Button
          type="button"
          size="icon"
          className="h-11 w-11 shrink-0"
          disabled={!chatInput.trim() || chatBusy}
          onClick={() => void sendChat()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const directionsPanel = (
    <div className="flex min-h-0 min-h-[8rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-muted/15">
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Initiative ideas
        </span>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Your pick feeds Brief and the rest of the flow.
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {hasStructured && workspace ? (
          <div className="space-y-1 p-2">
            {workspace.ideas.map((idea) => {
              const active = idea.id === selectedId
              return (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => selectIdea(idea.id)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="line-clamp-2 font-medium leading-snug">
                        {idea.title}
                      </span>
                      <span
                        className={`line-clamp-2 text-[11px] leading-relaxed ${
                          active
                            ? "text-primary-foreground/85"
                            : "text-muted-foreground"
                        }`}
                      >
                        {idea.tagline}
                      </span>
                    </div>
                    {active ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 opacity-90"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Run research first.
            </p>
            {generateButtonEmpty}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  const previewHeaderTop = (
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
      {onNavigate ? (
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5 font-medium"
          disabled={!selectedIdea && !legacyReadout}
          onClick={() => onNavigate("brief")}
        >
          Continue to initiative brief
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <span />
      )}
      {updatedAt && hasWorkspace ? (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          Updated {formatShortRelativePast(updatedAt)}
        </span>
      ) : null}
    </div>
  )

  const previewSubheader = (
    <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Preview
        </span>
        {selectedIdea ? (
          <span
            className="min-w-0 max-w-full truncate text-xs font-medium text-foreground/90"
            title={selectedIdea.title}
          >
            {selectedIdea.title}
          </span>
        ) : hasStructured ? (
          <span className="text-xs text-muted-foreground">Pick an idea</span>
        ) : null}
      </div>
    </div>
  )

  const previewBodyStructured = workspace ? (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-6 p-4 sm:p-5">
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="h-3.5 w-3.5" strokeWidth={2} />
            Problem restatement
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90">
            {workspace.problemRestatement}
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Research — competition & best practices
          </h3>
          <div
            className="artifact-content artifact-preview text-sm"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(workspace.landscapeMarkdown),
            }}
          />
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Selected idea
          </h3>
          {selectedIdea ? (
            <>
              <p className="text-sm font-medium text-foreground">
                {selectedIdea.tagline}
              </p>
              <div
                className="artifact-content artifact-preview text-sm"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(selectedIdea.detailMarkdown),
                }}
              />
              <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Research basis
                </p>
                <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                  {selectedIdea.researchBasis}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pick from the list.</p>
          )}
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sources
          </h3>
          <div
            className="artifact-content artifact-preview text-sm"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(workspace.sourcesMarkdown),
            }}
          />
        </section>
      </div>
    </ScrollArea>
  ) : null

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight">Ideas</h2>
            <Badge
              variant="secondary"
              className="h-auto border-0 bg-amber-500/12 px-2 py-0 text-[10px] font-medium text-amber-900 dark:text-amber-200"
            >
              Web research
            </Badge>
            {hasStructured && workspace && (
              <Badge variant="outline" className="h-auto py-0 text-[10px]">
                {workspace.ideas.length} ideas
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {contextModal}
            {hasWorkspace ? generateButtonCompact : null}
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {IDEAS_DESCRIPTION}
        </p>
      </div>

      {generating && (
        <div className="shrink-0 space-y-1">
          <Progress value={genProgress} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground">
            Web research in progress — often under a minute.
          </p>
        </div>
      )}

      {!hasWorkspace ? (
        <div className="workbench-pane-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto rounded-xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center sm:py-14">
          <Sparkles
            className="mb-3 h-10 w-10 text-muted-foreground/40"
            strokeWidth={2}
            aria-hidden
          />
          <p className="mb-1 font-medium text-foreground">No ideas yet</p>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Research builds ideas from Overview. Then refine, select one, open
            Brief.
          </p>
          {generateButtonEmpty}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden [grid-template-rows:minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-cols-12 lg:grid-rows-1">
          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden lg:col-span-4">
            {chatPanel}
            {directionsPanel}
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background lg:col-span-8">
            {previewHeaderTop}
            {legacyReadout && !hasStructured ? (
              <div className="shrink-0 border-b border-border bg-amber-500/10 px-3 py-2">
                <p className="text-[11px] font-medium text-amber-950 dark:text-amber-100">
                  Legacy format — <span className="font-semibold">Regenerate</span>{" "}
                  for structured ideas + chat.
                </p>
              </div>
            ) : null}
            {hasStructured ? previewSubheader : legacyReadout ? previewSubheader : null}
            {hasStructured && workspace ? (
              previewBodyStructured
            ) : legacyReadout ? (
              <ScrollArea className="min-h-0 flex-1">
                <div
                  className="artifact-content artifact-preview p-4 text-sm sm:p-5"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(legacyReadout),
                  }}
                />
              </ScrollArea>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                  <Sparkles
                    className="h-10 w-10 text-muted-foreground/30"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Generate ideas to see preview. Chat is included on regenerate.
                  </p>
                </div>
              </div>
            )}
            <div className="shrink-0 flex flex-wrap gap-2 border-t border-border bg-muted/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                disabled={!selectedIdea && !legacyReadout}
                onClick={() => void copyPreview()}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                disabled={!selectedIdea}
                onClick={mergeIntoContext}
              >
                <FileInput className="h-3.5 w-3.5" />
                Append idea to Additional thoughts
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
