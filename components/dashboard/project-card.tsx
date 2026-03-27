"use client"

import { useState } from "react"
import Link from "next/link"
import { Project, Artifact } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  ArrowUpRight,
  FileText,
  Layers,
  BookOpen,
  TestTube2,
  LayoutTemplate,
  Trash2,
  Clock,
} from "lucide-react"
import { formatDistanceToNow } from "@/lib/date-utils"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface ProjectCardProps {
  project: Project
  artifacts: Artifact[]
  onDelete: (id: string) => void
}

const STATUS_CONFIG = {
  active: {
    label: "Active",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stripe: "from-emerald-500 to-emerald-400",
  },
  completed: {
    label: "Completed",
    dot: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    stripe: "from-sky-500 to-sky-400",
  },
  archived: {
    label: "Archived",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    stripe: "from-slate-400 to-slate-300",
  },
}

export function ProjectCard({ project, artifacts, onDelete }: ProjectCardProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const brdCount = artifacts.filter((a) => a.type === "brd").length
  const epicCount = artifacts.filter((a) => a.type === "epic").length
  const storyCount = artifacts.filter((a) => a.type === "story").length
  const testCount = artifacts.filter((a) => a.type === "test_case").length
  const layoutCount = artifacts.filter((a) => a.type === "screen_layout").length
  const approvedCount = artifacts.filter((a) => a.status === "approved").length
  const totalCount = artifacts.length
  const approvalPct =
    totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0
  const status = STATUS_CONFIG[project.status]

  const workspaceHref = `/projects/${project.id}`

  return (
    <>
      <div className="group relative bg-card rounded-2xl border border-border/70 overflow-hidden card-elevated outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        {/* Top accent stripe */}
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${status.stripe} opacity-80 z-[1] pointer-events-none`}
        />

        {/* Full-card hit target (menu uses z-20 + pointer-events-auto) */}
        <Link
          href={workspaceHref}
          className="absolute inset-0 z-0 rounded-2xl"
          aria-label={`Open workspace: ${project.name}`}
        />

        {/* Card content */}
        <div className="relative z-10 p-5 pt-6 pointer-events-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {status.label}
                </span>
              </div>
              <h3 className="font-semibold text-[14px] text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-150">
                {project.name}
              </h3>
            </div>

            <div className="pointer-events-auto shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  nativeButton
                  className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-transparent bg-background/80 hover:bg-muted opacity-0 shadow-sm transition-all group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-foreground"
                  aria-label="Initiative actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer text-[13px] gap-2"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete initiative
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-[13px] text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Artifact pills */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[
              {
                icon: FileText,
                count: brdCount,
                label: "BRD",
                color: "text-violet-500 bg-violet-50 border-violet-200/70",
              },
              {
                icon: Layers,
                count: epicCount,
                label: "Epics",
                color: "text-blue-500 bg-blue-50 border-blue-200/70",
              },
              {
                icon: BookOpen,
                count: storyCount,
                label: "Stories",
                color: "text-sky-500 bg-sky-50 border-sky-200/70",
              },
              {
                icon: TestTube2,
                count: testCount,
                label: "Tests",
                color: "text-emerald-500 bg-emerald-50 border-emerald-200/70",
              },
              {
                icon: LayoutTemplate,
                count: layoutCount,
                label: "Layouts",
                color: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200/70",
              },
            ].map(({ icon: Icon, count, label, color }) => (
              <div
                key={label}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${color}`}
              >
                <Icon className="w-3 h-3" strokeWidth={2} />
                <span>
                  {count} {label}
                </span>
              </div>
            ))}
          </div>

          {/* Approval progress */}
          {totalCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">
                  Approval progress
                </span>
                <span className="text-[11px] font-semibold text-foreground">
                  {approvalPct}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${approvalPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1" aria-hidden>
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(project.createdAt)}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
              Open workspace
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete this initiative?"
        description={`“${project.name}” and all of its artifacts will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => onDelete(project.id)}
      />
    </>
  )
}
