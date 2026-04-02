import type { Artifact } from "@/lib/types"
import type { WorkspaceAgentStep } from "@/lib/workspace-generation"
import type {
  WorkbenchAgentActivityDetail,
  WorkbenchAgentActivityKind,
  WorkbenchAgentSourceTag,
} from "@/lib/workbench-agent-activity"

export function trunc(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim()
  if (!t.length) return "(empty)"
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

const OPENAI: WorkbenchAgentSourceTag = { id: "openai", label: "OpenAI API" }
const PROMPTS: WorkbenchAgentSourceTag = {
  id: "prompts",
  label: "Agent prompts (Settings)",
}

export function buildIdeationGenerateDetail(opts: {
  projectName: string
  description: string
  croContext: string
  contextBlockChars: number
}): WorkbenchAgentActivityDetail {
  return {
    kind: "generate_ideation",
    contextLines: [
      "API: POST /api/ai/ideation (OpenAI Responses + web search)",
      `Initiative: ${opts.projectName.trim() || "(unnamed)"}`,
      opts.description.trim()
        ? `Problem Statement: ${trunc(opts.description, 140)}`
        : "Problem Statement: (none — model infers from name/additional thoughts)",
      opts.croContext.trim()
        ? `Additional thoughts: ${trunc(opts.croContext, 120)}`
        : "Additional thoughts: (none)",
      `Project context block size: ${opts.contextBlockChars.toLocaleString()} characters`,
    ],
    sources: [
      { id: "initiative", label: "Initiative fields" },
      { id: "web-search", label: "Web search (OpenAI)" },
      OPENAI,
    ],
  }
}

export function buildIdeationChatDetail(opts: {
  turns: number
  digestChars: number
}): WorkbenchAgentActivityDetail {
  return {
    kind: "ideation_chat",
    contextLines: [
      "API: POST /api/ai/ideation-chat (stream)",
      `Ideas tab chat turns in request: ${opts.turns}`,
      `Directions digest size: ${opts.digestChars.toLocaleString()} characters`,
    ],
    sources: [
      { id: "initiative", label: "Initiative context" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildIdeationMergeDetail(opts: {
  ideaCount: number
  chatTurns: number
}): WorkbenchAgentActivityDetail {
  return {
    kind: "ideation_merge_workspace",
    contextLines: [
      "API: POST /api/ai/ideation-merge",
      `Current workspace directions: ${opts.ideaCount}`,
      `Ideas tab chat turns: ${opts.chatTurns}`,
    ],
    sources: [
      { id: "initiative", label: "Initiative context + workspace JSON" },
      OPENAI,
    ],
  }
}

export function buildInitiativeBriefGenerateDetail(opts: {
  projectName: string
  description: string
  croContext: string
  contextBlockChars: number
}): WorkbenchAgentActivityDetail {
  return {
    kind: "generate_initiative_brief",
    contextLines: [
      "API: POST /api/ai/initiative-brief",
      `Initiative: ${opts.projectName.trim() || "(unnamed)"}`,
      opts.description.trim()
        ? `Problem Statement: ${trunc(opts.description, 140)}`
        : "Problem Statement: (none — brief infers from name/additional thoughts; assumptions in Open questions)",
      opts.croContext.trim()
        ? `Additional thoughts: ${trunc(opts.croContext, 120)}`
        : "Additional thoughts: (none — conservative digital-sales assumptions if needed)",
      "Brief workspace chat in payload: 0 (Overview + initiative fields are ground truth)",
      `Project context block size: ${opts.contextBlockChars.toLocaleString()} characters`,
    ],
    sources: [
      { id: "initiative", label: "Initiative fields" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildInitiativeBriefRefineDetail(opts: {
  title: string
  draftChars: number
  instruction: string
  workspaceChatTurns: number
}): WorkbenchAgentActivityDetail {
  return {
    kind: "refine_initiative_brief",
    contextLines: [
      "API: POST /api/ai/refine (type: initiative_brief)",
      `Artifact: ${trunc(opts.title, 100)}`,
      `Current draft: ${opts.draftChars.toLocaleString()} characters`,
      `Workspace chat turns in feedback: ${opts.workspaceChatTurns}`,
      `Latest instruction: ${trunc(opts.instruction, 160)}`,
    ],
    sources: [
      { id: "workspace", label: "Workspace draft + chat" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildBrdGenerateDetail(opts: {
  projectName: string
  briefChars: number
  croContext: string
}): WorkbenchAgentActivityDetail {
  const hasBrief = opts.briefChars > 0
  return {
    kind: "generate_brd",
    contextLines: [
      "API: POST /api/ai/generate (type: brd)",
      `Initiative: ${opts.projectName.trim() || "(unnamed)"}`,
      hasBrief
        ? `Initiative brief in prompt: ${opts.briefChars.toLocaleString()} characters`
        : "Initiative brief: not included (none in workspace / legacy field)",
      opts.croContext.trim()
        ? `CRO / funnel context: ${trunc(opts.croContext, 120)}`
        : 'CRO context: fallback string ("Digital Sales initiative for Spectrum.com")',
    ],
    sources: [
      { id: "initiative", label: "Initiative name" },
      hasBrief
        ? { id: "brief", label: "Initiative brief text" }
        : { id: "brief", label: "No brief in payload" },
      opts.croContext.trim()
        ? { id: "cro", label: "CRO / funnel context" }
        : { id: "cro", label: "Default context line" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildEpicGenerateDetail(opts: {
  brdTitle: string
  brdChars: number
}): WorkbenchAgentActivityDetail {
  return {
    kind: "generate_epic",
    contextLines: [
      "API: POST /api/ai/generate (type: epic)",
      "Input: BRD markdown body only (parent artifact)",
      `BRD title: ${trunc(opts.brdTitle, 90)}`,
      `BRD body: ${opts.brdChars.toLocaleString()} characters`,
    ],
    sources: [
      { id: "workspace-brd", label: "Workspace BRD draft" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildStoryGenerateDetail(epics: { title: string; chars: number }[]): WorkbenchAgentActivityDetail {
  const lines = [
    "API: POST /api/ai/generate (type: story) — one request per epic",
    `${epics.length} epic workspace artifact(s) will be processed sequentially`,
    ...epics.slice(0, 5).map(
      (e, i) =>
        `Epic ${i + 1}: ${trunc(e.title, 72)} — ${e.chars.toLocaleString()} chars`
    ),
  ]
  if (epics.length > 5) {
    lines.push(`…and ${epics.length - 5} more epic(s)`)
  }
  return {
    kind: "generate_story",
    contextLines: lines,
    sources: [
      { id: "workspace-epic", label: "Workspace epic draft(s)" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildTestGenerateDetail(stories: { title: string; chars: number }[]): WorkbenchAgentActivityDetail {
  const lines = [
    "API: POST /api/ai/generate (type: test_case) — one request per story",
    `${stories.length} stor${stories.length === 1 ? "y" : "ies"} in workspace`,
    ...stories.slice(0, 5).map(
      (s, i) =>
        `Story ${i + 1}: ${trunc(s.title, 72)} — ${s.chars.toLocaleString()} chars`
    ),
  ]
  if (stories.length > 5) {
    lines.push(`…and ${stories.length - 5} more stor${stories.length - 5 === 1 ? "y" : "ies"}`)
  }
  return {
    kind: "generate_test_case",
    contextLines: lines,
    sources: [
      { id: "workspace-story", label: "Workspace story draft(s)" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildLayoutGenerateDetail(opts: {
  projectName: string
  storyCount: number
  totalChars: number
  croChars: number
}): WorkbenchAgentActivityDetail {
  return {
    kind: "generate_screen_layout",
    contextLines: [
      "API: POST /api/ai/generate (type: screen_layout)",
      `Initiative: ${opts.projectName.trim() || "(unnamed)"}`,
      `User stories aggregated: ${opts.storyCount} artifact(s), ${opts.totalChars.toLocaleString()} characters total`,
      opts.croChars > 0
        ? `CRO / funnel context: ${opts.croChars.toLocaleString()} characters`
        : "CRO context: short default string",
    ],
    sources: [
      { id: "workspace-story", label: "All workspace stories" },
      { id: "initiative", label: "Initiative name" },
      opts.croChars > 0
        ? { id: "cro", label: "CRO / funnel context" }
        : { id: "cro", label: "Default context" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildWorkspaceRefineDetail(
  kind: WorkbenchAgentActivityKind,
  opts: {
    title: string
    artifactTypeLabel: string
    draftChars: number
    instruction: string
    workspaceChatTurns: number
  }
): WorkbenchAgentActivityDetail {
  return {
    kind,
    contextLines: [
      `API: POST /api/ai/refine (type: ${opts.artifactTypeLabel})`,
      `Artifact: ${trunc(opts.title, 100)}`,
      `Current draft: ${opts.draftChars.toLocaleString()} characters`,
      `Workspace chat turns in feedback: ${opts.workspaceChatTurns}`,
      `Latest instruction: ${trunc(opts.instruction, 160)}`,
    ],
    sources: [
      { id: "workspace", label: "Workspace draft + chat" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildLibraryRefineDetail(opts: {
  title: string
  typeLabel: string
  draftChars: number
  feedbackPreview: string
}): WorkbenchAgentActivityDetail {
  return {
    kind: "refine_library_artifact",
    contextLines: [
      `API: POST /api/ai/refine (type: ${opts.typeLabel})`,
      `Artifact: ${trunc(opts.title, 100)}`,
      `Current body: ${opts.draftChars.toLocaleString()} characters`,
      `Your refinement note: ${trunc(opts.feedbackPreview, 160)}`,
    ],
    sources: [
      { id: "library", label: "Library artifact body" },
      PROMPTS,
      OPENAI,
    ],
  }
}

export function buildWorkspaceGenerationActivityDetail(
  step: WorkspaceAgentStep,
  p: {
    projectId: string
    projectName: string
    croContext: string
    artifacts: Artifact[]
    parentArtifacts: Artifact[]
    legacyInitiativeBriefChars: number
  }
): WorkbenchAgentActivityDetail {
  const briefArtifact = p.artifacts.find(
    (a) => a.projectId === p.projectId && a.type === "initiative_brief"
  )
  const briefChars =
    briefArtifact?.content?.trim().length ?? p.legacyInitiativeBriefChars

  if (step.type === "brd") {
    return buildBrdGenerateDetail({
      projectName: p.projectName,
      briefChars,
      croContext: p.croContext,
    })
  }

  if (step.type === "epic") {
    const brd = p.parentArtifacts[0]
    return buildEpicGenerateDetail({
      brdTitle: brd?.title ?? "(missing BRD)",
      brdChars: brd?.content?.trim().length ?? 0,
    })
  }

  if (step.type === "story") {
    return buildStoryGenerateDetail(
      p.parentArtifacts.map((e) => ({
        title: e.title,
        chars: e.content?.trim().length ?? 0,
      }))
    )
  }

  if (step.type === "test_case") {
    return buildTestGenerateDetail(
      p.parentArtifacts.map((s) => ({
        title: s.title,
        chars: s.content?.trim().length ?? 0,
      }))
    )
  }

  if (step.type === "screen_layout") {
    const stories = p.artifacts.filter((a) => a.type === "story")
    const total = stories.reduce(
      (n, s) => n + (s.content?.trim().length ?? 0),
      0
    )
    return buildLayoutGenerateDetail({
      projectName: p.projectName,
      storyCount: stories.length,
      totalChars: total,
      croChars: p.croContext.trim().length,
    })
  }

  return {
    kind: "generic",
    contextLines: ["API: generation in progress"],
    sources: [PROMPTS, OPENAI],
  }
}
