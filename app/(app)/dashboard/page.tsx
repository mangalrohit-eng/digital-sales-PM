"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useAppStore } from "@/lib/store"
import { ProjectCard } from "@/components/dashboard/project-card"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  FolderKanban,
  FileText,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

export default function DashboardPage() {
  const { data: session } = useSession()
  const [showNewProject, setShowNewProject] = useState(false)
  const { projects, artifacts, deleteProject } = useAppStore()

  const user = session?.user as
    | { name: string; role: string; title: string }
    | undefined

  const totalArtifacts = artifacts.length
  const approvedArtifacts = artifacts.filter((a) => a.status === "approved").length
  const pushedToJira = artifacts.filter((a) => a.jiraTicketId).length

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const handleDelete = (id: string) => {
    deleteProject(id)
    toast.success("Initiative deleted")
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting}, {user?.name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your Spectrum.com CRO initiatives and AI-generated artifacts
            </p>
          </div>
          <Button
            onClick={() => setShowNewProject(true)}
            className="gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New initiative
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: FolderKanban,
              label: "Active initiatives",
              value: projects.filter((p) => p.status === "active").length,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              icon: FileText,
              label: "Artifacts generated",
              value: totalArtifacts,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              icon: CheckCircle2,
              label: "Approved",
              value: approvedArtifacts,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-2.5 rounded-lg ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Project grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">
              Initiatives
              {projects.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({projects.length})
                </span>
              )}
            </h2>
          </div>

          {projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  No initiatives yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                  Create your first CRO initiative to start brainstorming ideas
                  and generating artifacts with AI.
                </p>
                <Button
                  onClick={() => setShowNewProject(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create first initiative
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  artifacts={artifacts.filter(
                    (a) => a.projectId === project.id
                  )}
                  onDelete={handleDelete}
                />
              ))}
              {/* Add new card */}
              <button
                onClick={() => setShowNewProject(true)}
                className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all p-8 text-center group"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 transition-colors mb-3">
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                  New initiative
                </p>
              </button>
            </div>
          )}
        </div>

        {pushedToJira > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700">
              <span className="font-semibold">{pushedToJira} artifact{pushedToJira !== 1 ? "s" : ""}</span>{" "}
              have been pushed to Jira successfully.
            </p>
          </div>
        )}
      </div>

      <NewProjectDialog
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        ownerName={user?.name ?? "Unknown"}
        ownerRole={user?.role ?? "analyst"}
      />
    </>
  )
}
