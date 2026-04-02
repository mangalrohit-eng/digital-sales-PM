import type { ElementType } from "react"
import {
  FileText,
  Layers,
  BookOpen,
  TestTube2,
  LayoutTemplate,
} from "lucide-react"
import type { Artifact, ArtifactType } from "./types"
import { splitEpicBoldBlocks, sanitizeEpicTitle } from "./epic-markdown"
import { useAppStore } from "./store"
import { toast } from "sonner"
import { fetchGenerateStream, settleBeforeArtifact } from "./ai-stream-client"

export interface WorkspaceAgentStep {
  tab: string
  type: ArtifactType
  navLabel: string
  description: string
  icon: ElementType
  dependsOn: ArtifactType | null
}

export const WORKSPACE_AGENT_STEPS: WorkspaceAgentStep[] = [
  {
    tab: "agent-brd",
    type: "brd",
    navLabel: "BRD",
    description:
      "Business requirements from initiative context. Refine in chat, then finalize to the library.",
    icon: FileText,
    dependsOn: null,
  },
  {
    tab: "agent-epic",
    type: "epic",
    navLabel: "Epics",
    description:
      "Themed epics from the BRD. Finalize each when it is ready for the artifact tree.",
    icon: Layers,
    dependsOn: "brd",
  },
  {
    tab: "agent-story",
    type: "story",
    navLabel: "Stories",
    description:
      "User stories per epic with acceptance criteria.",
    icon: BookOpen,
    dependsOn: "epic",
  },
  {
    tab: "agent-test",
    type: "test_case",
    navLabel: "Tests",
    description:
      "Test cases derived from stories.",
    icon: TestTube2,
    dependsOn: "story",
  },
  {
    tab: "agent-layout",
    type: "screen_layout",
    navLabel: "Layouts",
    description:
      "Screen specs and Figma-oriented JSON from stories.",
    icon: LayoutTemplate,
    dependsOn: "story",
  },
]

export function getWorkspaceStep(
  tab: string
): WorkspaceAgentStep | undefined {
  return WORKSPACE_AGENT_STEPS.find((s) => s.tab === tab)
}

export function getWorkspaceStepByType(
  type: ArtifactType
): WorkspaceAgentStep | undefined {
  return WORKSPACE_AGENT_STEPS.find((s) => s.type === type)
}

type AddArtifactFn = (data: {
  projectId: string
  parentId: string | null
  type: ArtifactType
  title: string
  content: string
  status: Artifact["status"]
  published: boolean
}) => void

function pushPlanningPreview(
  text: string,
  onPlanning?: (text: string) => void
) {
  const t = text.trim()
  if (t && onPlanning) onPlanning(t)
}

export async function runAgentGeneration(
  step: WorkspaceAgentStep,
  ctx: {
    projectId: string
    projectName: string
    croContext: string
    artifacts: Artifact[]
    addArtifact: AddArtifactFn
    onProgress: (pct: number) => void
    /** Called when the API returns a model planning block (footer panel). */
    onPlanning?: (text: string) => void
  }
): Promise<void> {
  const {
    projectId,
    projectName,
    croContext,
    artifacts,
    addArtifact,
    onProgress,
    onPlanning,
  } = ctx
  const parentArtifacts = step.dependsOn
    ? artifacts.filter((a) => a.type === step.dependsOn)
    : []

  if (step.dependsOn && parentArtifacts.length === 0) {
    const label =
      step.dependsOn === "brd"
        ? "BRD"
        : step.dependsOn === "epic"
          ? "epics"
          : "user stories"
    throw new Error(`Create ${label} first in the earlier workspace tab.`)
  }

  onProgress(10)

  const agentPrompts = useAppStore.getState().agentPrompts

  if (step.type === "brd") {
    const project = useAppStore.getState().getProject(projectId)
    const briefArtifact = artifacts.find(
      (a) => a.projectId === projectId && a.type === "initiative_brief"
    )
    const brief =
      briefArtifact?.content?.trim() || project?.initiativeBrief?.trim()
    const briefBlock = brief
      ? `Initiative brief (from Brief tab — align the BRD with this):\n${brief}`
      : ""
    const tail =
      croContext?.trim() ||
      "Digital Sales initiative for Spectrum.com"
    const context = [
      `Initiative: ${projectName}`,
      briefBlock,
      `Additional product / funnel context:\n${tail}`,
    ]
      .filter(Boolean)
      .join("\n\n")
    onProgress(30)
    const data = await fetchGenerateStream(
      {
        type: "brd",
        context,
        title: `BRD: ${projectName}`,
        agentPrompts,
      },
      (preview) => pushPlanningPreview(preview, onPlanning)
    )
    onProgress(80)
    await settleBeforeArtifact()
    addArtifact({
      projectId,
      parentId: null,
      type: "brd",
      title: `BRD: ${projectName}`,
      content: data.content,
      status: "draft",
      published: false,
    })
    onProgress(100)
    toast.success("BRD draft is ready — review and finalize when done.")
    return
  }

  if (step.type === "epic") {
    const brd = parentArtifacts[0]
    onProgress(20)
    const data = await fetchGenerateStream(
      {
        type: "epic",
        context: brd.content,
        title: "Epics",
        agentPrompts,
      },
      (preview) => pushPlanningPreview(preview, onPlanning)
    )
    onProgress(80)
    await settleBeforeArtifact()
    const epicBlocks = splitEpicBoldBlocks(data.content)
    const count = Math.max(epicBlocks.length, 1)
    if (epicBlocks.length > 0) {
      epicBlocks.forEach((block: string, i: number) => {
        const titleMatch = block.match(/^\*\*Epic \d+:\s*([^*]+)\*\*/)
        const rawTitle = titleMatch ? titleMatch[1].trim() : ""
        const title = sanitizeEpicTitle(rawTitle, i + 1)
        addArtifact({
          projectId,
          parentId: brd.id,
          type: "epic",
          title,
          content: block.trim(),
          status: "draft",
          published: false,
        })
      })
    } else {
      addArtifact({
        projectId,
        parentId: brd.id,
        type: "epic",
        title: "Epics",
        content: data.content,
        status: "draft",
        published: false,
      })
    }
    onProgress(100)
    toast.success(
      `${count} epic draft${count !== 1 ? "s" : ""} ready — finalize each when ready.`
    )
    return
  }

  if (step.type === "story") {
    let totalStories = 0
    for (let i = 0; i < parentArtifacts.length; i++) {
      const epic = parentArtifacts[i]
      onProgress(Math.round(10 + (i / parentArtifacts.length) * 80))
      const data = await fetchGenerateStream(
        {
          type: "story",
          context: epic.content,
          title: "User Stories",
          agentPrompts,
        },
        (preview) => pushPlanningPreview(preview, onPlanning)
      )
      await settleBeforeArtifact()
      const storyBlocks = data.content.split(/(?=\*\*Story \d)/g).filter(Boolean)
      if (storyBlocks.length > 1) {
        storyBlocks.forEach((block: string, j: number) => {
          const titleMatch = block.match(/\*\*Story \d+:\s*([^\*\n]+)\*\*/)
          const title = titleMatch ? titleMatch[1].trim() : `Story ${j + 1}`
          addArtifact({
            projectId,
            parentId: epic.id,
            type: "story",
            title,
            content: block.trim(),
            status: "draft",
            published: false,
          })
          totalStories++
        })
      } else {
        addArtifact({
          projectId,
          parentId: epic.id,
          type: "story",
          title: `Stories for ${epic.title}`,
          content: data.content,
          status: "draft",
          published: false,
        })
        totalStories++
      }
    }
    onProgress(100)
    toast.success(
      `${totalStories} user stor${totalStories !== 1 ? "ies" : "y"} drafted.`
    )
    return
  }

  if (step.type === "test_case") {
    let totalTests = 0
    for (let i = 0; i < parentArtifacts.length; i++) {
      const story = parentArtifacts[i]
      onProgress(Math.round(10 + (i / parentArtifacts.length) * 80))
      const data = await fetchGenerateStream(
        {
          type: "test_case",
          context: story.content,
          title: "Test Cases",
          agentPrompts,
        },
        (preview) => pushPlanningPreview(preview, onPlanning)
      )
      await settleBeforeArtifact()
      addArtifact({
        projectId,
        parentId: story.id,
        type: "test_case",
        title: `Tests: ${story.title}`,
        content: data.content,
        status: "draft",
        published: false,
      })
      totalTests++
    }
    onProgress(100)
    toast.success(`${totalTests} test draft${totalTests !== 1 ? "s" : ""} ready.`)
    return
  }

  if (step.type === "screen_layout") {
    const stories = artifacts.filter((a) => a.type === "story")
    if (stories.length === 0) {
      throw new Error("Add user stories before generating screen layouts.")
    }
    const context = `Initiative: ${projectName}\n\nDigital Sales context:\n${croContext || "Digital Sales / commerce initiative"}\n\n---\n\nUser stories:\n\n${stories
      .map((s) => `### ${s.title}\n${s.content}`)
      .join("\n\n---\n\n")}`
    onProgress(25)
    const data = await fetchGenerateStream(
      {
        type: "screen_layout",
        context,
        title: `Screen layouts: ${projectName}`,
        agentPrompts,
      },
      (preview) => pushPlanningPreview(preview, onPlanning)
    )
    onProgress(80)
    await settleBeforeArtifact()
    addArtifact({
      projectId,
      parentId: null,
      type: "screen_layout",
      title: `Screen layouts: ${projectName}`,
      content: data.content,
      status: "draft",
      published: false,
    })
    onProgress(100)
    toast.success("Layout draft ready — finalize to add it to the library.")
    return
  }
}
