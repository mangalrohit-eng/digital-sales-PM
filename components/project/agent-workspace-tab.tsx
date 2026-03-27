"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import type { ChatMessage } from "@/lib/types"
import {
  runAgentGeneration,
  type WorkspaceAgentStep,
} from "@/lib/workspace-generation"
import { getAgentForArtifactType } from "@/lib/agents"
import { renderMarkdown, stripOuterMarkdownFence } from "@/lib/markdown-html"
import {
  splitEpicBoldBlocks,
  sanitizeEpicTitle,
  stripMarkdownPreambleBeforeFirstEpic,
  isPlausibleEpicSectionHeading,
} from "@/lib/epic-markdown"
import {
  FigmaHandoffPreview,
  screenLayoutMarkdownForPreview,
} from "@/components/project/figma-handoff-preview"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import {
  Loader2,
  Sparkles,
  Send,
  CheckCircle2,
  Info,
  MessageSquare,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { formatShortRelativePast } from "@/lib/date-utils"
import { useWorkbenchAgentBusy } from "@/components/project/workbench-agent-busy-context"
import type { ArtifactType } from "@/lib/types"
import type { WorkbenchAgentActivityKind } from "@/lib/workbench-agent-activity"
import {
  buildWorkspaceGenerationActivityDetail,
  buildWorkspaceRefineDetail,
} from "@/lib/workbench-agent-activity-builders"
import { fetchRefineStream, settleBeforeArtifact } from "@/lib/ai-stream-client"

function workspaceRefineKind(type: ArtifactType): WorkbenchAgentActivityKind {
  const m: Record<ArtifactType, WorkbenchAgentActivityKind> = {
    initiative_brief: "refine_initiative_brief",
    brd: "refine_brd",
    epic: "refine_epic",
    story: "refine_story",
    test_case: "refine_test_case",
    screen_layout: "refine_screen_layout",
  }
  return m[type] ?? "generic"
}

interface AgentWorkspaceTabProps {
  projectId: string
  projectName: string
  croContext: string
  userName: string
  step: WorkspaceAgentStep
}

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

function parseEpicSections(markdown: string): Array<{ title: string; body: string }> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const sections: Array<{ title: string; bodyLines: string[] }> = []
  let current: { title: string; bodyLines: string[] } | null = null

  for (const line of lines) {
    const heading = line.match(/^#{2,4}\s+(.+?)\s*$/)
    if (heading) {
      if (current) sections.push(current)
      current = { title: heading[1], bodyLines: [] }
      continue
    }
    if (current) current.bodyLines.push(line)
  }

  if (current) sections.push(current)

  return sections
    .map((section) => ({
      title: section.title,
      body: section.bodyLines.join("\n").trim(),
    }))
    .filter((section) => section.title.trim().length > 0)
}

/** Epics: prefer **Epic N:** blocks when present; else ## sections (junk headings filtered). */
function getEpicPreviewSections(
  markdown: string
): Array<{ title: string; body: string }> | null {
  const n = stripMarkdownPreambleBeforeFirstEpic(
    stripOuterMarkdownFence(markdown.replace(/\r\n/g, "\n")).trim()
  )
  if (!n) return null

  const epicOnlyChunks = splitEpicBoldBlocks(n)
  if (epicOnlyChunks.length > 0) {
    return epicOnlyChunks.map((chunk, i) => {
      const line = chunk.split("\n")[0] ?? ""
      const m = line.match(/^\*\*Epic \d+:\s*([^*]+)\*\*/)
      const rawTitle = m ? m[1].trim() : ""
      return {
        title: sanitizeEpicTitle(rawTitle, i + 1),
        body: m ? chunk.slice(chunk.indexOf("\n") + 1).trim() : chunk,
      }
    })
  }

  const byHeading = parseEpicSections(n)
  const plausible = byHeading.filter((s) =>
    isPlausibleEpicSectionHeading(s.title)
  )
  if (plausible.length > 1) {
    return plausible.map((s, i) => ({
      ...s,
      title: sanitizeEpicTitle(s.title, i + 1),
    }))
  }
  if (plausible.length === 1) {
    const s = plausible[0]
    return [{ ...s, title: sanitizeEpicTitle(s.title, 1) }]
  }
  if (byHeading.length > 1) {
    return byHeading.map((s, i) => ({
      ...s,
      title: sanitizeEpicTitle(s.title, i + 1),
    }))
  }
  if (byHeading.length === 1) {
    const s = byHeading[0]
    return [{ ...s, title: sanitizeEpicTitle(s.title, 1) }]
  }
  return null
}

/** One **Story N: …** block → card title + body (title never the fence language tag). */
function parseStorySectionChunk(
  chunk: string,
  index: number
): { title: string; body: string } {
  const lines = chunk.replace(/\r\n/g, "\n").split("\n")
  const first = (lines[0] ?? "").trim()
  const m = first.match(/^\*\*Story (\d+):\s*(.*?)\*\*\s*$/)
  const num = m?.[1] ?? String(index + 1)
  let title = (m?.[2] ?? "").trim()
  let bodyLines = lines.slice(1)

  if (!m) {
    return { title: `Story ${index + 1}`, body: chunk.trim() }
  }

  if (!title || /^markdown$/i.test(title)) {
    const next = bodyLines[0]?.trim() ?? ""
    if (
      next &&
      !/^[-*]\s/.test(next) &&
      !/^\d+\.\s/.test(next) &&
      next.length < 220
    ) {
      title = next.replace(/^\*\*|\*\*$/g, "").trim()
      bodyLines = bodyLines.slice(1)
    }
    if (!title || /^markdown$/i.test(title)) {
      title = `Story ${num}`
    }
  }

  return { title, body: bodyLines.join("\n").trim() }
}

/** User stories: **Story N: Title** blocks. */
function getStoryPreviewSections(
  markdown: string
): Array<{ title: string; body: string }> | null {
  const n = stripOuterMarkdownFence(markdown.replace(/\r\n/g, "\n")).trim()
  if (!n || !/\*\*Story \d+/.test(n)) return null
  const chunks = n
    .split(/(?=\*\*Story \d+)/g)
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => /^\*\*Story \d+/.test(c))
  if (chunks.length === 0) return null
  return chunks.map((chunk, i) => parseStorySectionChunk(chunk, i))
}

/** Test cases: **TC-N: Title** blocks. */
function getTestPreviewSections(
  markdown: string
): Array<{ title: string; body: string }> | null {
  const n = stripOuterMarkdownFence(markdown.replace(/\r\n/g, "\n")).trim()
  if (!n || !/\*\*TC-/i.test(n)) return null
  const chunks = n
    .split(/(?=\*\*TC-)/gi)
    .map((c) => c.trim())
    .filter(Boolean)
  return chunks.map((chunk, i) => {
    const line = chunk.split("\n")[0] ?? ""
    const m = line.match(/^\*\*(TC-\d+[^:]*:\s*[^*]+)\*\*/i)
    const title = m ? m[1].trim() : `Test case ${i + 1}`
    const body = m
      ? chunk.slice(chunk.indexOf("\n") + 1).trim()
      : chunk.replace(/^\*\*TC-[^*]+\*\*\s*/i, "")
    return { title, body }
  })
}

function WorkspaceSpecCard({
  heading,
  badge,
  bodyMd,
}: {
  heading: string
  badge: string
  bodyMd: string
}) {
  return (
    <Card className="border-border/80 bg-card shadow-sm ring-1 ring-black/[0.03]">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 pb-3">
          <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
            {heading}
          </h3>
          <Badge
            variant="secondary"
            className="shrink-0 border border-border/80 bg-muted/60 text-[10px] font-semibold text-muted-foreground"
          >
            {badge}
          </Badge>
        </div>
        <div
          className="artifact-content artifact-preview text-sm [&_ul]:mt-1 [&_ol]:mt-1"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(bodyMd.trim() || "_No details provided_"),
          }}
        />
      </CardContent>
    </Card>
  )
}

/** Count epics inside markdown (one workspace artifact can hold many). Uses **Epic N, ## Epic headings, and ## section count—whichever is highest. */
function countEpicsInContent(markdown: string): number {
  const trimmed = markdown.replace(/\r\n/g, "\n").trim()
  if (!trimmed) return 0

  const fromBoldSplit = splitEpicBoldBlocks(trimmed).length
  const fromBoldMarkers = trimmed.match(/\*\*Epic \d+/g)?.length ?? 0
  const fromEpicHeadings = trimmed
    .split("\n")
    .filter((line) => /^#{2,4}\s+Epic\b/i.test(line)).length
  const sectionCount = parseEpicSections(trimmed).length

  return Math.max(fromBoldSplit, fromBoldMarkers, fromEpicHeadings, sectionCount, 1)
}

export function AgentWorkspaceTab({
  projectId,
  projectName,
  croContext,
  userName,
  step,
}: AgentWorkspaceTabProps) {
  const {
    begin: beginAgentBusy,
    end: endAgentBusy,
    patchActiveDetail,
  } = useWorkbenchAgentBusy()
  /** Select stable `artifacts` array; filter in useMemo so the store snapshot is referentially stable. */
  const allArtifacts = useAppStore((s) => s.artifacts)
  const artifacts = useMemo(
    () => allArtifacts.filter((a) => a.projectId === projectId),
    [allArtifacts, projectId]
  )
  const addArtifact = useAppStore((s) => s.addArtifact)
  const updateArtifact = useAppStore((s) => s.updateArtifact)

  const agent = getAgentForArtifactType(step.type)

  const parentArtifacts = useMemo(() => {
    if (!step.dependsOn) return []
    return artifacts.filter((a) => a.type === step.dependsOn)
  }, [artifacts, step.dependsOn])

  const canGenerate =
    !step.dependsOn || parentArtifacts.length > 0

  const workspaceItems = useMemo(
    () => artifacts.filter((a) => a.type === step.type),
    [artifacts, step.type]
  )
  const epicRollup = useMemo(() => {
    if (step.type !== "epic") return null
    let total = 0
    let finalizedEpics = 0
    let draftEpics = 0
    for (const a of workspaceItems) {
      const n = countEpicsInContent(a.content)
      total += n
      if (a.published) finalizedEpics += n
      else draftEpics += n
    }
    return { total, finalizedEpics, draftEpics, workspaceCount: workspaceItems.length }
  }, [step.type, workspaceItems])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = workspaceItems.find((a) => a.id === selectedId) ?? null

  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [chatInput, setChatInput] = useState("")
  const [refining, setRefining] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sectionCardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [highlightedSectionIndex, setHighlightedSectionIndex] = useState(0)

  useEffect(() => {
    if (workspaceItems.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !workspaceItems.some((a) => a.id === selectedId)) {
      setSelectedId(workspaceItems[0].id)
    }
  }, [workspaceItems, selectedId])

  useEffect(() => {
    setHighlightedSectionIndex(0)
    sectionCardRefs.current = []
  }, [selectedId])

  const runGenerate = async () => {
    setGenerating(true)
    setGenProgress(0)
    const legacyBriefChars =
      useAppStore
        .getState()
        .getProject(projectId)
        ?.initiativeBrief?.trim().length ?? 0
    beginAgentBusy(
      buildWorkspaceGenerationActivityDetail(step, {
        projectId,
        projectName,
        croContext,
        artifacts,
        parentArtifacts,
        legacyInitiativeBriefChars: legacyBriefChars,
      })
    )
    try {
      await runAgentGeneration(step, {
        projectId,
        projectName,
        croContext,
        artifacts,
        addArtifact,
        onProgress: setGenProgress,
        onPlanning: (text) => patchActiveDetail({ planning: text }),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed")
    } finally {
      endAgentBusy()
      setGenerating(false)
      setTimeout(() => setGenProgress(0), 800)
    }
  }

  const sendChat = async () => {
    if (!selected || !chatInput.trim() || refining) return
    const text = chatInput.trim()
    setChatInput("")
    const prior = selected.workspaceChat ?? []
    const feedback = buildRefineFeedback(text, prior)

    setRefining(true)
    beginAgentBusy(
      buildWorkspaceRefineDetail(workspaceRefineKind(selected.type), {
        title: selected.title,
        artifactTypeLabel: selected.type,
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
          "I updated the artifact from your last message. Review the preview and send another instruction if needed.",
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

  const finalize = () => {
    if (!selected) return
    if (selected.published) return
    updateArtifact(selected.id, { published: true })
    toast.success("Added to Artifacts — you can continue review and approval there.")
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selected?.workspaceChat?.length, refining, selected?.id])

  const sectionNavItems = useMemo((): Array<{ title: string; body: string }> => {
    if (!selected) return []
    if (selected.type === "epic") {
      const s = getEpicPreviewSections(selected.content)
      return s && s.length > 1 ? s : []
    }
    if (selected.type === "story") {
      const s = getStoryPreviewSections(selected.content)
      return s && s.length > 1 ? s : []
    }
    if (selected.type === "test_case") {
      const s = getTestPreviewSections(selected.content)
      return s && s.length > 1 ? s : []
    }
    if (selected.type === "screen_layout") {
      const md = screenLayoutMarkdownForPreview(selected.content)
      if (!md.trim()) return []
      const sections = parseEpicSections(md)
      return sections.length > 1 ? sections : []
    }
    return []
  }, [selected])

  useEffect(() => {
    if (sectionNavItems.length === 0) return
    setHighlightedSectionIndex((i) =>
      i >= sectionNavItems.length ? 0 : i
    )
  }, [sectionNavItems.length, selected?.id])

  if (!canGenerate) {
    const need =
      step.dependsOn === "brd"
        ? "BRD"
        : step.dependsOn === "epic"
          ? "epics"
          : "user stories"
    return (
      <div className="workbench-pane-scroll mx-auto flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="max-w-lg">
          <Info className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h2 className="mb-2 font-semibold">{step.navLabel}</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Create {need} in the previous workspace tab first, then return here to
            generate {step.navLabel.toLowerCase()}.
          </p>
        </div>
      </div>
    )
  }

  const hasWorkspaceItems = workspaceItems.length > 0
  const generateLabel = hasWorkspaceItems
    ? `Regenerate ${step.navLabel}`
    : `Generate ${step.navLabel}`
  const generateLabelCompact = hasWorkspaceItems ? "Regenerate" : "Generate"

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

  const epicPreviewSections =
    selected?.type === "epic" ? getEpicPreviewSections(selected.content) : null
  const storyPreviewSections =
    selected?.type === "story" ? getStoryPreviewSections(selected.content) : null
  const testPreviewSections =
    selected?.type === "test_case"
      ? getTestPreviewSections(selected.content)
      : null
  const layoutMarkdownOnly =
    selected?.type === "screen_layout"
      ? screenLayoutMarkdownForPreview(selected.content)
      : ""
  const layoutSpecSections =
    selected?.type === "screen_layout" && layoutMarkdownOnly.trim()
      ? parseEpicSections(layoutMarkdownOnly)
      : []
  const showStructuredEpic =
    selected?.type === "epic" &&
    epicPreviewSections != null &&
    epicPreviewSections.length > 0
  const showStructuredStory =
    selected?.type === "story" &&
    storyPreviewSections != null &&
    storyPreviewSections.length > 0
  const showStructuredTest =
    selected?.type === "test_case" &&
    testPreviewSections != null &&
    testPreviewSections.length > 0
  const showStructuredLayoutSpec =
    selected?.type === "screen_layout" && layoutSpecSections.length > 0

  const jumpToNavLabel =
    step.type === "epic"
      ? "Epics in this draft"
      : step.type === "story"
        ? "Stories in this draft"
        : step.type === "test_case"
          ? "Test cases in this draft"
          : step.type === "screen_layout"
            ? "Spec sections in this draft"
            : "Sections"

  const scrollPreviewToSection = (index: number) => {
    setHighlightedSectionIndex(index)
    requestAnimationFrame(() => {
      sectionCardRefs.current[index]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    })
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight">{step.navLabel}</h2>
            <Badge
              variant="secondary"
              className="h-auto border-0 bg-primary/10 px-2 py-0 text-[10px] font-medium text-primary"
            >
              {agent.name}
            </Badge>
            <Badge variant="outline" className="h-auto py-0 text-[10px]">
              {workspaceItems.length} in workspace
            </Badge>
          </div>
          {hasWorkspaceItems ? generateButtonCompact : null}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{step.description}</p>
      </div>

      {generating && (
        <div className="shrink-0 space-y-1">
          <Progress value={genProgress} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground">
            This may take 10–30 seconds…
          </p>
        </div>
      )}

      {workspaceItems.length === 0 ? (
        <div className="workbench-pane-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto rounded-xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center sm:py-14">
          <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-1 font-medium">No drafts in this workspace</p>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Run generate to create a draft. It stays here until you finalize it to
            the Artifacts library.
          </p>
          {generateButtonEmpty}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden [grid-template-rows:minmax(0,1fr)_minmax(0,1.2fr)] lg:grid-cols-12 lg:grid-rows-1">
          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden lg:col-span-4">
            {/* Chat — top left; list always below for parity with Stories */}
            <div className="flex min-h-0 min-h-[10rem] flex-[1.15] flex-col overflow-hidden rounded-xl border border-border bg-background">
            <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Chat
                </span>
                <Badge variant="secondary" className="bg-primary/10 text-[10px] text-primary">
                  Live updates on
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {agent.name} applies each message directly to this {step.navLabel.toLowerCase()} draft.
              </p>
            </div>
              <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-3">
                {(selected?.workspaceChat ?? []).length === 0 && (
                  <p className="px-1 text-xs italic text-muted-foreground">
                    e.g. “Tighten goals in section 2” or “Add KPI table under
                    risks.”
                  </p>
                )}
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
                    Updating artifact…
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
                disabled={!selected || refining}
              />
              <Button
                type="button"
                size="icon"
                className="h-11 w-11 shrink-0"
                disabled={!selected || !chatInput.trim() || refining}
                onClick={() => void sendChat()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            </div>

            <div className="flex min-h-0 min-h-[8rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-muted/20">
              <p className="shrink-0 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {workspaceItems.length === 1 && sectionNavItems.length > 1
                  ? jumpToNavLabel
                  : `${step.navLabel} in workspace`}
              </p>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1 p-2">
                  {workspaceItems.length > 1 || sectionNavItems.length <= 1
                    ? workspaceItems.map((a, idx) => (
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
                            <span className="line-clamp-2 font-medium">
                              {step.type === "epic"
                                ? sanitizeEpicTitle(a.title, idx + 1)
                                : a.title}
                            </span>
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
                      ))
                    : null}

                  {workspaceItems.length > 1 && sectionNavItems.length > 1 ? (
                    <div
                      className="my-2 border-t border-border pt-2"
                      role="presentation"
                    />
                  ) : null}

                  {workspaceItems.length > 1 && sectionNavItems.length > 1 ? (
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {jumpToNavLabel}
                    </p>
                  ) : null}

                  {sectionNavItems.length > 1
                    ? sectionNavItems.map((section, index) => (
                        <button
                          key={`${section.title}-${index}`}
                          type="button"
                          onClick={() => scrollPreviewToSection(index)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            highlightedSectionIndex === index
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2 font-medium">
                              {section.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`shrink-0 text-[10px] ${
                                highlightedSectionIndex === index
                                  ? "border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground"
                                  : ""
                              }`}
                            >
                              {step.type === "epic"
                                ? `Epic ${index + 1}`
                                : step.type === "story"
                                  ? `Story ${index + 1}`
                                  : step.type === "test_case"
                                    ? `TC ${index + 1}`
                                    : `${index + 1}`}
                            </Badge>
                          </div>
                        </button>
                      ))
                    : null}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Preview — working artifact on the right */}
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
                      title={
                        step.type === "epic"
                          ? sanitizeEpicTitle(
                              selected.title,
                              workspaceItems.findIndex((x) => x.id === selected.id) + 1
                            )
                          : selected.title
                      }
                    >
                      {step.type === "epic"
                        ? sanitizeEpicTitle(
                            selected.title,
                            workspaceItems.findIndex((x) => x.id === selected.id) + 1
                          )
                        : selected.title}
                    </span>
                  )}
                  {(step.type === "epic" && epicRollup) || selected?.workspaceChatRefinedAt ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[10px] leading-none text-muted-foreground">
                      {step.type === "epic" && epicRollup ? (
                        <>
                          <span className="text-muted-foreground/35" aria-hidden>
                            ·
                          </span>
                          <span>
                            {epicRollup.total} epic{epicRollup.total !== 1 ? "s" : ""} in content ·{" "}
                            {epicRollup.finalizedEpics} finalized · {epicRollup.draftEpics} draft
                            {epicRollup.workspaceCount > 1
                              ? ` · ${epicRollup.workspaceCount} in workspace`
                              : null}
                          </span>
                        </>
                      ) : null}
                      {selected?.workspaceChatRefinedAt ? (
                        <>
                          {(step.type === "epic" && epicRollup) ? (
                            <span className="text-muted-foreground/35" aria-hidden>
                              ·
                            </span>
                          ) : null}
                          <span
                            className="inline-flex items-center gap-0.5"
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
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                {selected && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {selected.published ? (
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
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
                          onClick={finalize}
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
                {selected?.type === "screen_layout" && (
                  <div className="space-y-4">
                    {showStructuredLayoutSpec ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Written spec
                        </p>
                        {layoutSpecSections.map((section, index) => (
                          <div
                            key={`${section.title}-${index}`}
                            ref={(el) => {
                              sectionCardRefs.current[index] = el
                            }}
                            className={`rounded-xl transition-[box-shadow] duration-200 ${
                              highlightedSectionIndex === index
                                ? "ring-2 ring-primary/45 ring-offset-2 ring-offset-background"
                                : ""
                            }`}
                          >
                            <WorkspaceSpecCard
                              heading={section.title}
                              badge={`Section ${index + 1}`}
                              bodyMd={section.body}
                            />
                          </div>
                        ))}
                      </div>
                    ) : layoutMarkdownOnly.trim() ? (
                      <div
                        className="artifact-content artifact-preview text-sm"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(layoutMarkdownOnly),
                        }}
                      />
                    ) : null}
                    <FigmaHandoffPreview content={selected.content} />
                  </div>
                )}

                {selected &&
                  selected.type === "epic" &&
                  showStructuredEpic &&
                  epicPreviewSections && (
                    <div className="space-y-3">
                      {epicPreviewSections.map((section, index) => (
                        <div
                          key={`${section.title}-${index}`}
                          ref={(el) => {
                            sectionCardRefs.current[index] = el
                          }}
                          className={`rounded-xl transition-[box-shadow] duration-200 ${
                            highlightedSectionIndex === index
                              ? "ring-2 ring-primary/45 ring-offset-2 ring-offset-background"
                              : ""
                          }`}
                        >
                          <WorkspaceSpecCard
                            heading={section.title}
                            badge={`Epic ${index + 1}`}
                            bodyMd={section.body}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                {selected &&
                  selected.type === "story" &&
                  showStructuredStory &&
                  storyPreviewSections && (
                    <div className="space-y-3">
                      {storyPreviewSections.map((section, index) => (
                        <div
                          key={`${section.title}-${index}`}
                          ref={(el) => {
                            sectionCardRefs.current[index] = el
                          }}
                          className={`rounded-xl transition-[box-shadow] duration-200 ${
                            highlightedSectionIndex === index
                              ? "ring-2 ring-primary/45 ring-offset-2 ring-offset-background"
                              : ""
                          }`}
                        >
                          <WorkspaceSpecCard
                            heading={section.title}
                            badge={`Story ${index + 1}`}
                            bodyMd={section.body}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                {selected &&
                  selected.type === "test_case" &&
                  showStructuredTest &&
                  testPreviewSections && (
                    <div className="space-y-3">
                      {testPreviewSections.map((section, index) => (
                        <div
                          key={`${section.title}-${index}`}
                          ref={(el) => {
                            sectionCardRefs.current[index] = el
                          }}
                          className={`rounded-xl transition-[box-shadow] duration-200 ${
                            highlightedSectionIndex === index
                              ? "ring-2 ring-primary/45 ring-offset-2 ring-offset-background"
                              : ""
                          }`}
                        >
                          <WorkspaceSpecCard
                            heading={section.title}
                            badge={`TC ${index + 1}`}
                            bodyMd={section.body}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                {selected &&
                  selected.type !== "screen_layout" &&
                  !showStructuredEpic &&
                  !showStructuredStory &&
                  !showStructuredTest && (
                    <div
                      className="artifact-content artifact-preview text-sm"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(selected.content),
                      }}
                    />
                  )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}
