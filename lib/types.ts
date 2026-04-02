export type ArtifactType =
  | "initiative_brief"
  | "brd"
  | "epic"
  | "story"
  | "test_case"
  | "screen_layout"
export type ArtifactStatus = "draft" | "in_review" | "approved"
export type ProjectStatus = "active" | "completed" | "archived"

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
}

export interface Comment {
  id: string
  artifactId: string
  author: string
  authorRole: string
  text: string
  createdAt: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

/** One solution direction from the Ideas tab (web-researched). */
export interface IdeationIdea {
  id: string
  title: string
  tagline: string
  /** Markdown: scope, bets, UX implications for this direction. */
  detailMarkdown: string
  /** How this ties to landscape / best practices. */
  researchBasis: string
}

/** Full Ideas workspace payload (from /api/ai/ideation). */
export interface IdeationWorkspace {
  problemRestatement: string
  /** Competitive landscape, category benchmarks, best practices (markdown). */
  landscapeMarkdown: string
  ideas: IdeationIdea[]
  sourcesMarkdown: string
}

export interface Artifact {
  id: string
  projectId: string
  parentId: string | null
  type: ArtifactType
  title: string
  content: string
  status: ArtifactStatus
  comments: Comment[]
  jiraTicketId?: string
  /** Demo: simulated Figma file sync timestamp (screen layouts). */
  figmaSyncedAt?: string
  /** Demo: simulated Confluence page publish timestamp (brief & BRD). */
  confluenceSyncedAt?: string
  createdAt: string
  updatedAt: string
  /** `false` = draft in agent workspace only until finalized; omit or `true` = visible in Artifacts library */
  published?: boolean
  /** Chat history while editing in an agent workspace tab */
  workspaceChat?: ChatMessage[]
  /** Set when content was last revised from the workspace chat (refine flow). */
  workspaceChatRefinedAt?: string
}

export interface Project {
  id: string
  name: string
  /** Problem statement (Overview label: Problem Statement), e.g. reduce cart abandonment. */
  description: string
  /** Optional extra context (constraints, KPIs, audience). */
  cro_context: string
  /** Living summary from Brief tab chat; fed into BRD generation. */
  initiativeBrief?: string
  /** Structured Ideas workspace (research + directions). */
  ideation?: IdeationWorkspace
  /** Which `ideation.ideas[].id` is the focus for Brief / initiative brief (PM choice). */
  selectedIdeationId?: string | null
  /** ISO timestamp when ideation workspace was last generated. */
  ideationUpdatedAt?: string
  /** @deprecated Legacy single markdown blob; migrate via Regenerate on Ideas. */
  ideationReadout?: string
  owner: string
  ownerRole: string
  createdAt: string
  status: ProjectStatus
  chatHistory: ChatMessage[]
  /** Ideas tab chat with Scout (brainstorm / refine initiative ideas). */
  ideationChat?: ChatMessage[]
}

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  initiative_brief: "Initiative brief",
  brd: "Business Requirements",
  epic: "Epic",
  story: "User Story",
  test_case: "Test Case",
  screen_layout: "Screen layout",
}

export const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
}

export const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  in_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
}
