"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Artifact, ArtifactType, ArtifactStatus, STATUS_COLORS, STATUS_LABELS, ARTIFACT_TYPE_LABELS } from "@/lib/types"
import { getAgentForArtifactType } from "@/lib/agents"
import {
  FigmaHandoffPreview,
  screenLayoutMarkdownForPreview,
} from "@/components/project/figma-handoff-preview"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Layers,
  BookOpen,
  TestTube2,
  LayoutTemplate,
  Sparkles,
  Target,
  Edit3,
  Save,
  X,
  Trash2,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "@/lib/date-utils"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { isPublishedToLibrary } from "@/lib/artifact-published"
import { renderMarkdown } from "@/lib/markdown-html"

const TYPE_ICONS: Record<ArtifactType, React.ElementType> = {
  initiative_brief: Target,
  brd: FileText,
  epic: Layers,
  story: BookOpen,
  test_case: TestTube2,
  screen_layout: LayoutTemplate,
}

interface ArtifactsTabProps {
  projectId: string
  userRole: string
  userName: string
}

interface ArtifactNodeProps {
  artifact: Artifact
  children: Artifact[]
  allArtifacts: Artifact[]
  depth: number
  userRole: string
  userName: string
  selectedId: string | null
  onSelect: (id: string) => void
}

function ArtifactNode({
  artifact,
  children,
  allArtifacts,
  depth,
  userRole,
  userName,
  selectedId,
  onSelect,
}: ArtifactNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const Icon = TYPE_ICONS[artifact.type]
  const isSelected = selectedId === artifact.id
  const hasChildren = children.length > 0

  const statusIcon =
    artifact.status === "approved" ? (
      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
    ) : artifact.status === "in_review" ? (
      <Clock className="w-3 h-3 text-amber-500" />
    ) : (
      <Circle className="w-3 h-3 text-slate-300" />
    )

  return (
    <div>
      <button
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all group
          ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60"}
        `}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(artifact.id)}
      >
        {hasChildren ? (
          <span
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
        />
        <span className="flex-1 truncate font-medium leading-tight">
          {artifact.title}
        </span>
        {statusIcon}
        {artifact.jiraTicketId && (
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1 font-mono bg-sky-50 text-sky-700 border-sky-200 shrink-0"
          >
            {artifact.jiraTicketId}
          </Badge>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <ArtifactNode
              key={child.id}
              artifact={child}
              children={allArtifacts.filter((a) => a.parentId === child.id)}
              allArtifacts={allArtifacts}
              depth={depth + 1}
              userRole={userRole}
              userName={userName}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ArtifactDetail({
  artifact,
  userRole,
  userName,
}: {
  artifact: Artifact
  userRole: string
  userName: string
}) {
  const { updateArtifact, deleteArtifact, addComment } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(artifact.content)
  const [commentText, setCommentText] = useState("")
  const [showComments, setShowComments] = useState(false)
  const [refineFeedback, setRefineFeedback] = useState("")
  const [refining, setRefining] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const canApprove = userRole === "admin"
  const canSubmitForReview = artifact.status === "draft"
  const canApproveArtifact =
    canApprove && artifact.status === "in_review"
  const canRequestChanges =
    canApprove && artifact.status === "in_review"

  const handleSave = () => {
    updateArtifact(artifact.id, { content: editContent })
    setEditing(false)
    toast.success("Artifact saved")
  }

  const handleStatusChange = (status: ArtifactStatus) => {
    updateArtifact(artifact.id, { status })
    const messages: Record<ArtifactStatus, string> = {
      draft: "Moved back to Draft",
      in_review: "Submitted for review",
      approved: "Artifact approved",
    }
    toast.success(messages[status])
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    addComment(artifact.id, {
      author: userName,
      authorRole: userRole,
      text: commentText.trim(),
    })
    setCommentText("")
    toast.success("Comment added")
  }

  const handleDelete = () => {
    deleteArtifact(artifact.id)
    toast.success("Artifact deleted")
  }

  const handleRefine = async () => {
    if (!refineFeedback.trim()) {
      toast.error("Describe what to change")
      return
    }
    setRefining(true)
    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: artifact.title,
          type: artifact.type,
          content: artifact.content,
          feedback: refineFeedback.trim(),
          agentPrompts: useAppStore.getState().agentPrompts,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Refinement failed")
      }
      const next = data.content as string
      if (!next?.trim()) throw new Error("Empty response")
      updateArtifact(artifact.id, { content: next.trim() })
      addComment(artifact.id, {
        author: userName,
        authorRole: userRole,
        text: `[Refinement] ${refineFeedback.trim()}`,
      })
      setRefineFeedback("")
      toast.success("Artifact updated from your feedback")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refinement failed")
    } finally {
      setRefining(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Artifact header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-auto">
              {ARTIFACT_TYPE_LABELS[artifact.type]}
            </Badge>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-auto font-medium bg-primary/10 text-primary border-0"
            >
              {getAgentForArtifactType(artifact.type).name}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-auto ${STATUS_COLORS[artifact.status]}`}
            >
              {STATUS_LABELS[artifact.status]}
            </Badge>
            {artifact.jiraTicketId && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-auto font-mono bg-sky-50 text-sky-700 border-sky-200"
              >
                {artifact.jiraTicketId}
              </Badge>
            )}
          </div>
          <h2 className="font-semibold text-base leading-tight line-clamp-2">
            {artifact.title}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!editing && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                setEditContent(artifact.content)
                setEditing(true)
              }}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            aria-label="Delete artifact"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this artifact?"
        description={`“${artifact.title}” will be removed. Child artifacts under it are removed as well. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Scrollable body: flex min-h-0 so preview scrolls inside the pane */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[400px] font-mono text-xs resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={handleSave}>
                <Save className="w-3.5 h-3.5" />
                Save changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8"
                onClick={() => setEditing(false)}
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {artifact.type === "screen_layout" && (
              <FigmaHandoffPreview content={artifact.content} />
            )}
            <div
              className="artifact-content artifact-preview"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(
                  artifact.type === "screen_layout"
                    ? screenLayoutMarkdownForPreview(artifact.content)
                    : artifact.content
                ),
              }}
            />

            {!editing && (
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Refine with AI
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Rewrites the full artifact from your instructions (tone, missing
                  sections, stakeholder asks). A trace is added to comments.
                </p>
                <Textarea
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  placeholder="e.g. Add WCAG acceptance criteria, shorten executive summary, align KPIs with Q3 targets…"
                  className="min-h-[88px] text-sm resize-y mb-3"
                  disabled={refining}
                />
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={handleRefine}
                  disabled={refining || !refineFeedback.trim()}
                >
                  {refining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Refining…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Apply refinement
                    </>
                  )}
                </Button>
              </div>
            )}

            {!editing && (
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Review workflow
                </p>
                <div className="flex flex-wrap gap-2">
                  {canSubmitForReview && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleStatusChange("in_review")}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Submit for review
                    </Button>
                  )}
                  {canApproveArtifact && (
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleStatusChange("approved")}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                  )}
                  {canRequestChanges && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                      onClick={() => handleStatusChange("draft")}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Request changes
                    </Button>
                  )}
                  {artifact.status === "approved" && canApprove && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleStatusChange("in_review")}
                    >
                      Reopen for review
                    </Button>
                  )}
                </div>
                {!canApprove && artifact.status === "in_review" && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Awaiting Admin approval
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Comments */}
      <div className="border-t border-border shrink-0">
        <button
          className="flex items-center gap-2 w-full px-5 py-3 hover:bg-muted/40 transition-colors"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">
            Comments {artifact.comments.length > 0 && `(${artifact.comments.length})`}
          </span>
          {showComments ? (
            <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
          )}
        </button>

        {showComments && (
          <div className="space-y-3 px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {artifact.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {artifact.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-primary">
                        {comment.author[0]}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">
                          {comment.author}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 h-8 text-xs px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleAddComment}
                disabled={!commentText.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ArtifactsTab({
  projectId,
  userRole,
  userName,
}: ArtifactsTabProps) {
  const { getArtifactsByProject } = useAppStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const raw = getArtifactsByProject(projectId)
  const artifacts = raw.filter(isPublishedToLibrary)
  const publishedIds = new Set(artifacts.map((a) => a.id))
  const rootArtifacts = artifacts.filter(
    (a) => !a.parentId || !publishedIds.has(a.parentId)
  )
  const selectedArtifact = artifacts.find((a) => a.id === selectedId) ?? null

  if (artifacts.length === 0) {
    return (
      <div className="workbench-pane-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 text-center">
        <div className="max-w-sm">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No finalized artifacts yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Finalize your initiative brief from Discovery, then generate drafts in
            the BRD, Epics, Stories, Tests, or Layouts workspace tabs, refine them
            in chat, then use{" "}
            <strong className="font-medium text-foreground">Finalize to library</strong>{" "}
            to add them here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background md:flex-row">
      {/* Tree sidebar */}
      <div className="flex max-h-[min(40vh,280px)] min-h-0 w-full shrink-0 flex-col border-b border-border md:max-h-none md:h-full md:w-72 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Artifact tree
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ScrollArea className="flex-1 min-h-0 py-2">
          <div className="px-2">
            {rootArtifacts.map((artifact) => (
              <ArtifactNode
                key={artifact.id}
                artifact={artifact}
                children={artifacts.filter(
                  (a) => a.parentId === artifact.id
                )}
                allArtifacts={artifacts}
                depth={0}
                userRole={userRole}
                userName={userName}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-1.5">
          {[
            { color: "bg-slate-300", label: "Draft" },
            { color: "bg-amber-400", label: "In Review" },
            { color: "bg-emerald-500", label: "Approved" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {selectedArtifact ? (
          <ArtifactDetail
            key={selectedArtifact.id}
            artifact={selectedArtifact}
            userRole={userRole}
            userName={userName}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center p-8">
            <div>
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">Select an artifact</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Click any artifact in the tree to view, edit, and manage its
                review status.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
