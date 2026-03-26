"use client"

import { Project, Artifact } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  ArrowRight,
  FileText,
  Layers,
  BookOpen,
  TestTube2,
  Trash2,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "@/lib/date-utils"

interface ProjectCardProps {
  project: Project
  artifacts: Artifact[]
  onDelete: (id: string) => void
}

const STATUS_CONFIG = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", className: "bg-sky-50 text-sky-700 border-sky-200" },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-600 border-slate-200" },
}

export function ProjectCard({ project, artifacts, onDelete }: ProjectCardProps) {
  const brdCount = artifacts.filter((a) => a.type === "brd").length
  const epicCount = artifacts.filter((a) => a.type === "epic").length
  const storyCount = artifacts.filter((a) => a.type === "story").length
  const testCount = artifacts.filter((a) => a.type === "test_case").length
  const approvedCount = artifacts.filter((a) => a.status === "approved").length
  const status = STATUS_CONFIG[project.status]

  return (
    <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-auto font-medium ${status.className}`}
              >
                {status.label}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {project.name}
            </h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              }
            >
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete initiative
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {project.description}
          </p>
        )}

        {/* Artifact counts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: FileText, count: brdCount, label: "BRD" },
            { icon: Layers, count: epicCount, label: "Epics" },
            { icon: BookOpen, count: storyCount, label: "Stories" },
            { icon: TestTube2, count: testCount, label: "Tests" },
          ].map(({ icon: Icon, count, label }) => (
            <div
              key={label}
              className="flex flex-col items-center py-2 rounded-md bg-muted/60"
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
              <span className="text-sm font-semibold leading-none">{count}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDistanceToNow(project.createdAt)}</span>
            {approvedCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-emerald-600 font-medium">
                  {approvedCount} approved
                </span>
              </>
            )}
          </div>
          <Link href={`/projects/${project.id}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 hover:bg-primary hover:text-white hover:border-primary transition-all">
              Open
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
