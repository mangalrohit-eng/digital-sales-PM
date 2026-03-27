"use client"

import type { ElementType } from "react"
import {
  Project,
  Artifact,
  type ProjectStatus,
  PROJECT_STATUS_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  FileStack,
  Layers,
  BookOpen,
  TestTube2,
  CheckCircle2,
  Clock,
  Circle,
  Calendar,
  User,
  Target,
  Edit3,
  LayoutTemplate,
  Info,
  Sparkles,
} from "lucide-react"
import { formatDate, formatDistanceToNow } from "@/lib/date-utils"
import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/lib/store"
import { isPublishedToLibrary } from "@/lib/artifact-published"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OverviewTabProps {
  project: Project
  artifacts: Artifact[]
  /** Switch project workspace tab (URL `?tab=`). */
  onNavigate?: (tab: string) => void
}

function statusBadgeClass(status: ProjectStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "completed":
      return "bg-sky-50 text-sky-700 border-sky-200"
    case "archived":
      return "bg-slate-100 text-slate-600 border-slate-200"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

function backlogExcerpt(content: string, maxLen = 200): string {
  const plain = content
    .replace(/^#+\s+.*/gm, " ")
    .replace(/[*_`|[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return "No description in body yet."
  return plain.length <= maxLen ? plain : `${plain.slice(0, maxLen).trim()}…`
}

function sortArtifactsNewestFirst(a: Artifact, b: Artifact): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

function BacklogArtifactCard({
  artifact,
  accent,
  icon: Icon,
  iconClass,
  onOpenArtifacts,
}: {
  artifact: Artifact
  accent: string
  icon: ElementType<{ className?: string; strokeWidth?: number }>
  iconClass: string
  onOpenArtifacts?: (tab: string) => void
}) {
  const inLibrary = isPublishedToLibrary(artifact)
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md",
        accent
      )}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50",
              iconClass
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold text-foreground leading-snug">
              {artifact.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-auto py-0 px-2 font-medium border",
                  STATUS_COLORS[artifact.status]
                )}
              >
                {STATUS_LABELS[artifact.status]}
              </Badge>
              {!inLibrary && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-auto py-0 px-2 font-medium bg-sky-50 text-sky-800 border-sky-200/80"
                >
                  Workspace draft
                </Badge>
              )}
              {artifact.jiraTicketId && (
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                  {artifact.jiraTicketId}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
          {backlogExcerpt(artifact.content)}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            Updated {formatDistanceToNow(artifact.updatedAt)}
          </span>
          {onOpenArtifacts && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] font-medium text-primary"
              onClick={() => onOpenArtifacts("artifacts")}
            >
              Artifacts
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function OverviewTab({ project, artifacts, onNavigate }: OverviewTabProps) {
  const libraryArtifacts = artifacts.filter(isPublishedToLibrary)
  const { updateProject } = useAppStore()
  const [editingContext, setEditingContext] = useState(false)
  const [contextValue, setContextValue] = useState(project.cro_context)
  const [editingDetails, setEditingDetails] = useState(false)
  const [nameValue, setNameValue] = useState(project.name)
  const [descriptionValue, setDescriptionValue] = useState(project.description)

  useEffect(() => {
    setContextValue(project.cro_context)
    setNameValue(project.name)
    setDescriptionValue(project.description)
  }, [
    project.id,
    project.cro_context,
    project.name,
    project.description,
    project.status,
  ])

  const briefCount = libraryArtifacts.filter(
    (a) => a.type === "initiative_brief"
  ).length
  const brdCount = libraryArtifacts.filter((a) => a.type === "brd").length
  const epicCount = libraryArtifacts.filter((a) => a.type === "epic").length
  const storyCount = libraryArtifacts.filter((a) => a.type === "story").length
  const testCount = libraryArtifacts.filter((a) => a.type === "test_case").length
  const layoutCount = libraryArtifacts.filter((a) => a.type === "screen_layout").length

  const draftCount = libraryArtifacts.filter((a) => a.status === "draft").length
  const reviewCount = libraryArtifacts.filter((a) => a.status === "in_review").length
  const approvedCount = libraryArtifacts.filter((a) => a.status === "approved").length
  const jiraCount = libraryArtifacts.filter((a) => a.jiraTicketId).length

  const workspaceDraftTotal = artifacts.filter((a) => a.published === false).length
  const inReviewLibrary = libraryArtifacts.filter(
    (a) => a.status === "in_review"
  ).length

  const progressPct =
    libraryArtifacts.length === 0
      ? 0
      : Math.round((approvedCount / libraryArtifacts.length) * 100)

  const saveContext = () => {
    updateProject(project.id, { cro_context: contextValue })
    setEditingContext(false)
    toast.success("Context updated")
  }

  const saveDetails = () => {
    const name = nameValue.trim()
    if (!name) {
      toast.error("Initiative name is required")
      return
    }
    updateProject(project.id, {
      name,
      description: descriptionValue.trim(),
    })
    setEditingDetails(false)
    toast.success("Initiative details updated")
  }

  const onStatusChange = (next: ProjectStatus) => {
    updateProject(project.id, { status: next })
    toast.success(`Status set to ${PROJECT_STATUS_LABELS[next]}`)
  }

  const briefItems = [...artifacts]
    .filter((a) => a.type === "initiative_brief")
    .sort(sortArtifactsNewestFirst)
  const epicItems = [...artifacts]
    .filter((a) => a.type === "epic")
    .sort(sortArtifactsNewestFirst)
  const storyItems = [...artifacts]
    .filter((a) => a.type === "story")
    .sort(sortArtifactsNewestFirst)
  const testItems = [...artifacts]
    .filter((a) => a.type === "test_case")
    .sort(sortArtifactsNewestFirst)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="workbench-pane-scroll min-h-0 flex-1 overscroll-contain pr-2">
        <div className="mx-auto max-w-5xl space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-center gap-2">
        {libraryArtifacts.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 border border-border/60 text-[12px] font-medium text-muted-foreground">
              <FileStack className="w-3.5 h-3.5" />
              {libraryArtifacts.length} in library
            </div>
            {approvedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {approvedCount} approved
              </div>
            )}
            {inReviewLibrary > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-medium text-amber-700">
                {inReviewLibrary} in review
              </div>
            )}
          </>
        )}
        {workspaceDraftTotal > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-[12px] font-medium text-sky-800">
            {workspaceDraftTotal} draft{workspaceDraftTotal !== 1 ? "s" : ""} in
            workspace
          </div>
        )}
      </div>

      <div className="flex gap-2.5 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 sm:px-4">
        <Info
          className="w-4 h-4 shrink-0 text-primary mt-0.5"
          strokeWidth={2}
          aria-hidden
        />
        <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground/90">
            How this workspace works:
          </span>{" "}
          The initiative brief and BRD through Layouts keep{" "}
          <span className="text-foreground/80 font-medium">drafts</span> until
          you <span className="text-foreground/80 font-medium">finalize</span>{" "}
          them.{" "}
          <span className="text-foreground/80 font-medium">Artifacts</span> is
          your shared library for review and export. Use{" "}
          <span className="text-foreground/80 font-medium">Discovery</span> when
          you are ready to explore the problem with chat.
        </p>
      </div>

      {/* Initiative details */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 h-auto font-medium ${statusBadgeClass(project.status)}`}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <div className="flex items-center gap-2">
              <Label htmlFor="initiative-status" className="sr-only">
                Initiative status
              </Label>
              <select
                id="initiative-status"
                value={project.status}
                onChange={(e) =>
                  onStatusChange(e.target.value as ProjectStatus)
                }
                className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
              >
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {PROJECT_STATUS_LABELS[s]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {editingDetails ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="init-name" className="text-xs">
                  Initiative name
                </Label>
                <Input
                  id="init-name"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="init-desc" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="init-desc"
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={saveDetails}>
                  Save details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setNameValue(project.name)
                    setDescriptionValue(project.description)
                    setEditingDetails(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-bold leading-tight">{project.name}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs shrink-0"
                  onClick={() => setEditingDetails(true)}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </Button>
              </div>
              {project.description ? (
                <p className="text-muted-foreground mt-1 text-sm max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm italic">
                  No description. Use Edit to add one.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {project.owner}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Created {formatDate(project.createdAt)}
        </span>
      </div>

      {/* Approval progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Approval progress</p>
            <span className="text-sm font-semibold text-primary">
              {progressPct}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Circle, label: "Draft", value: draftCount, color: "text-slate-500" },
              { icon: Clock, label: "In Review", value: reviewCount, color: "text-amber-500" },
              { icon: CheckCircle2, label: "Approved", value: approvedCount, color: "text-emerald-500" },
              { icon: FileText, label: "In Jira", value: jiraCount, color: "text-sky-500" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Artifact counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            icon: Sparkles,
            label: "Initiative brief",
            count: briefCount,
            color: "bg-primary/10 text-primary",
          },
          { icon: FileText, label: "BRD", count: brdCount, color: "bg-violet-50 text-violet-600" },
          { icon: Layers, label: "Epics", count: epicCount, color: "bg-blue-50 text-blue-600" },
          { icon: BookOpen, label: "Stories", count: storyCount, color: "bg-sky-50 text-sky-600" },
          { icon: TestTube2, label: "Test Cases", count: testCount, color: "bg-emerald-50 text-emerald-600" },
          { icon: LayoutTemplate, label: "Layouts", count: layoutCount, color: "bg-fuchsia-50 text-fuchsia-700" },
        ].map(({ icon: Icon, label, count, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${color} mb-2`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Initiative brief, epics, stories, tests */}
      {(briefItems.length > 0 ||
        epicItems.length > 0 ||
        storyItems.length > 0 ||
        testItems.length > 0) && (
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Discovery &amp; backlog
            </p>
            <p className="text-xs text-muted-foreground">
              Finalize the initiative brief from Discovery; other drafts stay in
              workspace until you finalize. Library items appear in Artifacts.
            </p>
          </div>

          {briefItems.length > 0 && (
            <section className="space-y-3" aria-label="Initiative briefs">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
                Initiative brief
                <span className="font-normal normal-case text-muted-foreground/80">
                  ({briefItems.length})
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {briefItems.map((a) => (
                  <BacklogArtifactCard
                    key={a.id}
                    artifact={a}
                    accent="border-l-[3px] border-l-primary"
                    icon={Sparkles}
                    iconClass="text-primary bg-primary/10"
                    onOpenArtifacts={onNavigate}
                  />
                ))}
              </div>
            </section>
          )}

          {epicItems.length > 0 && (
            <section className="space-y-3" aria-label="Epics">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="h-4 w-4 text-blue-600" strokeWidth={2} />
                Epics
                <span className="font-normal normal-case text-muted-foreground/80">
                  ({epicItems.length})
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {epicItems.map((a) => (
                  <BacklogArtifactCard
                    key={a.id}
                    artifact={a}
                    accent="border-l-[3px] border-l-blue-500"
                    icon={Layers}
                    iconClass="text-blue-600 bg-blue-50"
                    onOpenArtifacts={onNavigate}
                  />
                ))}
              </div>
            </section>
          )}

          {storyItems.length > 0 && (
            <section className="space-y-3" aria-label="Stories">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <BookOpen className="h-4 w-4 text-sky-600" strokeWidth={2} />
                Stories
                <span className="font-normal normal-case text-muted-foreground/80">
                  ({storyItems.length})
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {storyItems.map((a) => (
                  <BacklogArtifactCard
                    key={a.id}
                    artifact={a}
                    accent="border-l-[3px] border-l-sky-500"
                    icon={BookOpen}
                    iconClass="text-sky-600 bg-sky-50"
                    onOpenArtifacts={onNavigate}
                  />
                ))}
              </div>
            </section>
          )}

          {testItems.length > 0 && (
            <section className="space-y-3" aria-label="Tests">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <TestTube2 className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                Test cases
                <span className="font-normal normal-case text-muted-foreground/80">
                  ({testItems.length})
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {testItems.map((a) => (
                  <BacklogArtifactCard
                    key={a.id}
                    artifact={a}
                    accent="border-l-[3px] border-l-emerald-500"
                    icon={TestTube2}
                    iconClass="text-emerald-600 bg-emerald-50"
                    onOpenArtifacts={onNavigate}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Digital Sales initiative context */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Initiative context</p>
            </div>
            {!editingContext && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setEditingContext(true)}
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </Button>
            )}
          </div>
          {editingContext ? (
            <div className="space-y-2">
              <Textarea
                value={contextValue}
                onChange={(e) => setContextValue(e.target.value)}
                rows={5}
                className="text-sm resize-none"
                placeholder="Goals, audience, funnel, KPIs, constraints, and anything else teams should align on…"
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={saveContext}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setContextValue(project.cro_context)
                    setEditingContext(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {project.cro_context || (
                <span className="italic">
                  No context yet. Adding goals and constraints here improves
                  discovery and generated artifacts.
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  )
}
