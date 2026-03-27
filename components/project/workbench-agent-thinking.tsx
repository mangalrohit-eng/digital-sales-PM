"use client"

import { useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import {
  BookMarked,
  BookOpen,
  BrainCircuit,
  Cloud,
  Database,
  FileText,
  Inbox,
  Kanban,
  Layers,
  Library,
  LineChart,
  Loader2,
  PenTool,
  SlidersHorizontal,
  Target,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useWorkbenchAgentBusy } from "@/components/project/workbench-agent-busy-context"
import {
  ACTIVITY_HEADLINE,
  type WorkbenchAgentSourceTag,
} from "@/lib/workbench-agent-activity"

const SOURCE_ICON: Record<string, LucideIcon> = {
  openai: Cloud,
  prompts: SlidersHorizontal,
  initiative: Target,
  brief: FileText,
  cro: LineChart,
  workspace: Inbox,
  "workspace-brd": FileText,
  "workspace-epic": Layers,
  "workspace-story": BookOpen,
  library: Library,
}

function SourceChip({ tag }: { tag: WorkbenchAgentSourceTag }) {
  const Icon = SOURCE_ICON[tag.id] ?? Database
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
      <Icon className="size-3 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
      {tag.label}
    </span>
  )
}

const REMOTE_INTEGRATIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "confluence", label: "Confluence", icon: BookMarked },
  { id: "jira", label: "Jira", icon: Kanban },
  { id: "figma", label: "Figma", icon: PenTool },
]

function DisconnectedIntegrationChip({
  label,
  icon: Icon,
}: {
  label: string
  icon: LucideIcon
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 bg-muted/25 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/65 sm:text-[11px]"
      title={`${label} is not connected—this demo does not query live ${label}.`}
    >
      <span
        className="relative inline-flex size-3.5 shrink-0 items-center justify-center"
        aria-hidden
      >
        <Icon className="size-3 opacity-55" strokeWidth={2} />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[calc(100%+6px)] -translate-x-1/2 -translate-y-1/2 rotate-[-38deg] bg-muted-foreground/50" />
      </span>
      <span className="line-through decoration-muted-foreground/35 decoration-1">
        {label}
      </span>
    </span>
  )
}

interface WorkbenchAgentThinkingProps {
  activeTab: string
  className?: string
}

export function WorkbenchAgentThinking({
  activeTab: _activeTab,
  className,
}: WorkbenchAgentThinkingProps) {
  const {
    busyCount,
    activeDetail,
    recentPlanning,
    dismissRecentPlanning,
  } = useWorkbenchAgentBusy()

  const inFlight = busyCount > 0 && activeDetail != null
  const completed = !inFlight && recentPlanning != null

  useEffect(() => {
    if (!completed || !recentPlanning) return
    const id = window.setTimeout(() => dismissRecentPlanning(), 5000)
    return () => window.clearTimeout(id)
  }, [completed, recentPlanning, dismissRecentPlanning])

  if (!inFlight && !completed) return null

  const headline = inFlight
    ? ACTIVITY_HEADLINE[activeDetail!.kind]
    : recentPlanning!.headline
  const planningText = inFlight
    ? (activeDetail!.planning?.trim() ?? "")
    : recentPlanning!.planning
  const sources = inFlight ? activeDetail!.sources : recentPlanning!.sources

  const showThinking = inFlight && !planningText

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        "shrink-0 border-t border-border/70 bg-background/92 px-3 py-2.5 shadow-[0_-8px_28px_-14px_oklch(0_0_0/0.14)] backdrop-blur-md sm:px-4 sm:py-3",
        "pb-[max(0.625rem,env(safe-area-inset-bottom))]",
        completed && "border-emerald-500/20 bg-emerald-500/[0.04]",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl min-w-0 items-start gap-2.5 sm:gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border text-primary",
            inFlight
              ? "border-primary/20 bg-primary/10"
              : "border-emerald-500/25 bg-emerald-500/10"
          )}
        >
          <BrainCircuit className="size-4" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="flex w-full min-w-0 items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                Request status
              </p>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-semibold sm:text-[11px]",
                  inFlight
                    ? "border-primary/25 bg-primary/8 text-primary"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                )}
                title={inFlight ? "Operation in progress" : "Last request finished"}
              >
                {headline}
              </span>
              {inFlight ? (
                <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  In progress
                </span>
              ) : (
                <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium text-emerald-800/90 dark:text-emerald-200/90 sm:text-[11px]">
                  Completed
                </span>
              )}
            </div>
            {completed ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => dismissRecentPlanning()}
                aria-label="Dismiss planning panel"
              >
                <X className="size-3.5" strokeWidth={2} aria-hidden />
              </Button>
            ) : null}
          </div>

          <div>
            {showThinking ? (
              <div
                className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/25 px-2.5 py-2 text-[11px] font-medium text-muted-foreground sm:text-xs"
                aria-busy="true"
                aria-label="Thinking"
              >
                <Loader2
                  className="size-3.5 shrink-0 animate-spin text-primary/80"
                  strokeWidth={2}
                  aria-hidden
                />
                <span>Thinking…</span>
              </div>
            ) : planningText ? (
              <div
                className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px] leading-relaxed text-foreground/90 [text-wrap:pretty] sm:max-h-52 sm:text-xs"
                aria-label="Model planning from this response"
              >
                {planningText}
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
              Tools this model can use
            </p>
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
              aria-label="Tools available to the model and integrations not in use"
            >
              <div className="flex flex-wrap gap-1.5" aria-label="Sent to your OpenAI key">
                {sources.map((tag) => (
                  <SourceChip key={`${tag.id}-${tag.label}`} tag={tag} />
                ))}
              </div>
              <span
                className="hidden h-4 w-px shrink-0 bg-border/70 sm:block"
                aria-hidden
              />
              <span className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/80 sm:text-[10px]">
                  Not connected
                </span>
                {REMOTE_INTEGRATIONS.map(({ id, label, icon }) => (
                  <DisconnectedIntegrationChip
                    key={id}
                    label={label}
                    icon={icon}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
