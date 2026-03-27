"use client"

import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  BrainCircuit,
  BookOpen,
  FileStack,
  GitBranch,
  Kanban,
  LayoutTemplate,
  Library,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Demo vision: agent grounds answers in connected enterprise knowledge, not chat alone. */
type KnowledgeSource = "git" | "figma" | "confluence" | "jira" | "wiki" | "artifacts"

const SOURCE_META: Record<
  KnowledgeSource,
  { short: string; Icon: LucideIcon }
> = {
  git: { short: "Git", Icon: GitBranch },
  figma: { short: "Figma", Icon: LayoutTemplate },
  confluence: { short: "Confluence", Icon: BookOpen },
  jira: { short: "Jira", Icon: Kanban },
  wiki: { short: "Wiki", Icon: Library },
  artifacts: { short: "Library", Icon: FileStack },
}

interface ThinkingBeat {
  text: string
  sources: KnowledgeSource[]
}

const GLOBAL_BEATS: ThinkingBeat[] = [
  {
    text: "Looking at previous code in git—blame and recent commits on the services this initiative touches…",
    sources: ["git"],
  },
  {
    text: "Evaluating design patterns from Figma: component variants, auto-layout, and token usage against the stories…",
    sources: ["figma"],
  },
  {
    text: "Searching Confluence for platform standards, NFRs, and ADRs that should constrain the draft…",
    sources: ["confluence"],
  },
  {
    text: "Cross-referencing the team wiki for auth flows, telemetry, and error-handling conventions…",
    sources: ["wiki", "confluence"],
  },
  {
    text: "Checking Jira for open defects and in-flight work on comparable journeys before suggesting scope…",
    sources: ["jira"],
  },
  {
    text: "Scanning the artifact library for reusable epics, stories, and test patterns to stay consistent…",
    sources: ["artifacts"],
  },
  {
    text: "Diffing prior merges to see how similar flows shipped without breaking downstream consumers…",
    sources: ["git"],
  },
  {
    text: "Reasoning: if we accept this requirement as stated, what new edge cases appear in downstream tests?",
    sources: ["artifacts"],
  },
  {
    text: "Weighing stakeholder phrasing in the brief against measurable acceptance criteria and metrics…",
    sources: ["confluence", "artifacts"],
  },
  {
    text: "Prioritizing what unblocks the next epic versus nice-to-haves that expand UAT surface area…",
    sources: ["jira", "artifacts"],
  },
  {
    text: "Flagging ambiguous language that could widen scope—proposing sharper definitions before finalize…",
    sources: ["wiki"],
  },
  {
    text: "Grounding the next suggestion in published artifacts so the library stays the source of truth…",
    sources: ["artifacts", "confluence"],
  },
]

const TAB_CONTEXT: Record<string, ThinkingBeat[]> = {
  overview: [
    {
      text: "Synthesizing initiative health from drafts, publications, and export readiness across stages…",
      sources: ["artifacts", "jira"],
    },
    {
      text: "Connecting overview metrics to what still needs refinement before the next handoff…",
      sources: ["artifacts"],
    },
  ],
  brainstorm: [
    {
      text: "Preserving discovery nuance while steering notes toward themes the BRD can own…",
      sources: ["wiki", "confluence"],
    },
    {
      text: "Relating CRO context to risks worth capturing—checking Confluence for past initiative learnings…",
      sources: ["confluence"],
    },
  ],
  "agent-brd": [
    {
      text: "Tracing business outcomes to verifiable success signals; pulling constraints from Confluence initiative pages…",
      sources: ["confluence", "artifacts"],
    },
    {
      text: "Reasoning: which requirements are contractual vs aspirational, and how do we phrase them safely?",
      sources: ["wiki"],
    },
  ],
  "agent-epic": [
    {
      text: "Clustering capabilities into epics; glancing at git ownership boundaries for realistic splits…",
      sources: ["git", "artifacts"],
    },
    {
      text: "Checking Jira epics on adjacent programs to avoid duplicate themes and conflicting priorities…",
      sources: ["jira"],
    },
  ],
  "agent-story": [
    {
      text: "Decomposing epics into user-valuable slices; validating each against linked Figma states…",
      sources: ["figma", "artifacts"],
    },
    {
      text: "Reasoning: does this story stand alone in a sprint, or does it imply hidden dependency stories?",
      sources: ["jira", "git"],
    },
  ],
  "agent-test": [
    {
      text: "Deriving negative paths and data edge cases; aligning expected results with Confluence platform behavior…",
      sources: ["confluence", "artifacts"],
    },
    {
      text: "Cross-checking similar test cases in the library for regression hooks and naming consistency…",
      sources: ["artifacts", "jira"],
    },
  ],
  "agent-layout": [
    {
      text: "Translating story intent into frame-oriented specs; evaluating design patterns from Figma and the DS file…",
      sources: ["figma", "wiki"],
    },
    {
      text: "Reasoning: which breakpoints and empty states are implied but not written in the story?",
      sources: ["figma", "confluence"],
    },
  ],
  artifacts: [
    {
      text: "Respecting publication state and versions when comparing artifacts to export and Jira mappings…",
      sources: ["artifacts", "jira"],
    },
    {
      text: "Searching Confluence for terminology that should match titles and descriptions in the library…",
      sources: ["confluence", "artifacts"],
    },
  ],
  export: [
    {
      text: "Validating field mappings before push; re-reading linked Jira epics to avoid duplicate tickets…",
      sources: ["jira", "artifacts"],
    },
    {
      text: "Looking at git release tags and changelogs to align export summaries with what engineering already shipped…",
      sources: ["git", "jira"],
    },
  ],
}

function buildRotation(activeTab: string): ThinkingBeat[] {
  const extra = TAB_CONTEXT[activeTab] ?? []
  const out: ThinkingBeat[] = []
  let a = 0
  let b = 0
  while (a < GLOBAL_BEATS.length || b < extra.length) {
    if (a < GLOBAL_BEATS.length) {
      out.push(GLOBAL_BEATS[a]!)
      a += 1
    }
    if (b < extra.length) {
      out.push(extra[b]!)
      b += 1
    }
  }
  return out.length > 0
    ? out
    : [
        {
          text: "Grounding responses in your initiative context, artifacts, and connected systems.",
          sources: ["artifacts"],
        },
      ]
}

interface WorkbenchAgentThinkingProps {
  activeTab: string
  className?: string
}

export function WorkbenchAgentThinking({
  activeTab,
  className,
}: WorkbenchAgentThinkingProps) {
  const rotation = useMemo(() => buildRotation(activeTab), [activeTab])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [activeTab])

  useEffect(() => {
    if (rotation.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % rotation.length)
    }, 5200)
    return () => window.clearInterval(id)
  }, [rotation.length])

  const beat = rotation[index]!
  const { text: line, sources } = beat

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "shrink-0 border-t border-border/70 bg-background/92 px-3 py-2.5 shadow-[0_-8px_28px_-14px_oklch(0_0_0/0.14)] backdrop-blur-md sm:px-4 sm:py-3",
        "pb-[max(0.625rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl min-w-0 items-start gap-2.5 sm:gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <BrainCircuit className="size-4" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
              Agent thinking
            </p>
            <span
              className="hidden h-3 w-px bg-border/80 sm:block"
              aria-hidden
            />
            <div
              className="flex flex-wrap items-center gap-1.5"
              aria-label="Knowledge sources in context"
            >
              {sources.map((key, si) => {
                const meta = SOURCE_META[key]
                const Icon = meta.Icon
                return (
                  <span
                    key={`${index}-${si}-${key}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground animate-in fade-in-0 zoom-in-95 duration-300 sm:text-[11px]"
                  >
                    <Icon
                      className="size-3 shrink-0 opacity-80"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {meta.short}
                  </span>
                )
              })}
            </div>
          </div>
          <p
            key={`${activeTab}-${index}`}
            className="mt-1.5 text-[12px] leading-snug text-foreground/90 transition-opacity duration-300 animate-in fade-in-0 sm:text-[13px] sm:leading-relaxed"
          >
            {line}
          </p>
        </div>
      </div>
    </div>
  )
}
