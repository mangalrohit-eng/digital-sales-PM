export type ArtifactType =
  | "brd"
  | "epic"
  | "story"
  | "test_case"
  | "screen_layout"
export type ArtifactStatus = "draft" | "in_review" | "approved"
export type ProjectStatus = "active" | "completed" | "archived"

export interface Comment {
  id: string
  artifactId: string
  author: string
  authorRole: string
  text: string
  createdAt: string
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
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface Project {
  id: string
  name: string
  description: string
  cro_context: string
  owner: string
  ownerRole: string
  createdAt: string
  status: ProjectStatus
  chatHistory: ChatMessage[]
}

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
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
