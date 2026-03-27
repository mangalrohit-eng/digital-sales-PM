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
  description: string
  cro_context: string
  /** Living summary from Discovery chat; fed into BRD generation. */
  initiativeBrief?: string
  owner: string
  ownerRole: string
  createdAt: string
  status: ProjectStatus
  chatHistory: ChatMessage[]
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
