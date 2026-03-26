"use client"

import {
  Project,
  Artifact,
  type ProjectStatus,
  PROJECT_STATUS_LABELS,
} from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
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
  MessageSquare,
  Sparkles,
  ArrowRight,
  Share2,
  LayoutTemplate,
} from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

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

export function OverviewTab({ project, artifacts, onNavigate }: OverviewTabProps) {
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

  const brdCount = artifacts.filter((a) => a.type === "brd").length
  const epicCount = artifacts.filter((a) => a.type === "epic").length
  const storyCount = artifacts.filter((a) => a.type === "story").length
  const testCount = artifacts.filter((a) => a.type === "test_case").length
  const layoutCount = artifacts.filter((a) => a.type === "screen_layout").length

  const draftCount = artifacts.filter((a) => a.status === "draft").length
  const reviewCount = artifacts.filter((a) => a.status === "in_review").length
  const approvedCount = artifacts.filter((a) => a.status === "approved").length
  const jiraCount = artifacts.filter((a) => a.jiraTicketId).length

  const progressPct =
    artifacts.length === 0
      ? 0
      : Math.round((approvedCount / artifacts.length) * 100)

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

  return (
    <div className="space-y-6 max-w-3xl">
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

      {onNavigate && (
        <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Core workflow
            </p>
            <p className="text-sm text-foreground/90 mb-4">
              <strong className="font-semibold text-foreground">Sage</strong> brainstorms;
              <strong className="font-semibold text-foreground"> Morgan, Atlas, Scribe, Sentinel, and Frame</strong> build the stack;
              <strong className="font-semibold text-foreground"> Quill</strong> refines in Artifacts;
              <strong className="font-semibold text-foreground"> Courier</strong> pushes to Jira. Export also covers Figma and Confluence.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onNavigate("brainstorm")}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Sage
                <ArrowRight className="w-3 h-3 opacity-50" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onNavigate("generate")}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Agents
                <ArrowRight className="w-3 h-3 opacity-50" />
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onNavigate("artifacts")}
              >
                <FileText className="w-3.5 h-3.5" />
                Artifacts
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onNavigate("export")}
              >
                <Share2 className="w-3.5 h-3.5" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="grid grid-cols-4 gap-3">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
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

      {/* Digital Sales initiative context */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Initiative context (Digital Sales)</p>
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
                placeholder="Describe goals, audience, funnel, KPIs, and constraints for this Digital Sales initiative…"
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
                  No context provided. Add context so agents (Sage, Morgan, …) produce better output.
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
