"use client"

import { Project, Artifact } from "@/lib/types"
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
} from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

interface OverviewTabProps {
  project: Project
  artifacts: Artifact[]
}

export function OverviewTab({ project, artifacts }: OverviewTabProps) {
  const { updateProject } = useAppStore()
  const [editingContext, setEditingContext] = useState(false)
  const [contextValue, setContextValue] = useState(project.cro_context)

  const brdCount = artifacts.filter((a) => a.type === "brd").length
  const epicCount = artifacts.filter((a) => a.type === "epic").length
  const storyCount = artifacts.filter((a) => a.type === "story").length
  const testCount = artifacts.filter((a) => a.type === "test_case").length

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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Project header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 h-auto font-medium ${
                project.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
          </div>
          <h2 className="text-xl font-bold">{project.name}</h2>
          {project.description && (
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              {project.description}
            </p>
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
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: FileText, label: "BRD", count: brdCount, color: "bg-violet-50 text-violet-600" },
          { icon: Layers, label: "Epics", count: epicCount, color: "bg-blue-50 text-blue-600" },
          { icon: BookOpen, label: "Stories", count: storyCount, color: "bg-sky-50 text-sky-600" },
          { icon: TestTube2, label: "Test Cases", count: testCount, color: "bg-emerald-50 text-emerald-600" },
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

      {/* CRO Context */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">CRO Context</p>
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
                placeholder="Describe the CRO context for this initiative..."
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
                  No context provided. Add context to improve AI generation quality.
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
