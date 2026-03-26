"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useAppStore } from "@/lib/store"
import type { Project, ProjectStatus } from "@/lib/types"
import { PROJECT_STATUS_LABELS } from "@/lib/types"
import { ProjectCard } from "@/components/dashboard/project-card"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Sparkles, Search } from "lucide-react"
import { toast } from "sonner"

type StatusFilter = "all" | ProjectStatus
type SortKey = "newest" | "oldest" | "name"

function sortProjects(list: Project[], sort: SortKey): Project[] {
  const next = [...list]
  if (sort === "name") {
    next.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    return next
  }
  next.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return sort === "newest" ? tb - ta : ta - tb
  })
  return next
}

interface InitiativesPanelProps {
  /** When "page", shows a page-style heading (used on /projects). */
  variant?: "dashboard" | "page"
  /** When both are set, the new-initiative dialog is controlled by the parent (e.g. dashboard hero). */
  newProjectDialogOpen?: boolean
  onNewProjectDialogOpenChange?: (open: boolean) => void
}

export function InitiativesPanel({
  variant = "dashboard",
  newProjectDialogOpen: controlledOpen,
  onNewProjectDialogOpenChange,
}: InitiativesPanelProps) {
  const { data: session } = useSession()
  const [internalNewProject, setInternalNewProject] = useState(false)
  const isControlled =
    controlledOpen !== undefined && onNewProjectDialogOpenChange !== undefined
  const showNewProject = isControlled ? controlledOpen : internalNewProject
  const setShowNewProject = isControlled
    ? onNewProjectDialogOpenChange
    : setInternalNewProject
  const { projects, artifacts, deleteProject } = useAppStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sort, setSort] = useState<SortKey>("newest")

  const user = session?.user as
    | { name: string; role: string; title: string }
    | undefined

  const handleDelete = (id: string) => {
    deleteProject(id)
    toast.success("Initiative deleted")
  }

  const filteredProjects = useMemo(() => {
    let list = projects
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }
    return sortProjects(list, sort)
  }, [projects, statusFilter, search, sort])

  const filterToolbar = projects.length > 0 && (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between mb-5">
      <div>
        {variant === "dashboard" ? (
          <>
            <h2 className="text-[15px] font-semibold text-foreground">
              Initiatives
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {filteredProjects.length}
                {filteredProjects.length !== projects.length
                  ? ` of ${projects.length}`
                  : ` total`}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click an initiative to open the AI workspace
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredProjects.length} shown
              {filteredProjects.length !== projects.length
                ? ` of ${projects.length} total`
                : ""}
            </p>
          </>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search initiatives…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
            aria-label="Search initiatives"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
            className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground shadow-sm"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              )
            )}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground shadow-sm"
            aria-label="Sort initiatives"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div>
        {variant === "page" && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Initiatives</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Search, filter, and open any Digital Sales initiative workspace.
            </p>
          </div>
        )}

        {projects.length === 0 ? (
          <>
            {variant === "dashboard" && (
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[15px] font-semibold text-foreground">
                    Initiatives
                  </h2>
                </div>
              </div>
            )}
            <div className="rounded-2xl border-2 border-dashed border-border/70 bg-background/40 p-14 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-[15px] text-foreground mb-2">
                No initiatives yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6 leading-relaxed">
                Create your first initiative to run Sage, the generate pipeline
                agents, and Quill—powered by GPT-4o.
              </p>
              <Button
                type="button"
                onClick={() => setShowNewProject(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create first initiative
              </Button>
            </div>
          </>
        ) : (
          <>
            {filterToolbar}
            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-10 text-center">
                <p className="text-sm font-medium text-foreground mb-1">
                  No initiatives match
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Try a different search or status filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setStatusFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    artifacts={artifacts.filter(
                      (a) => a.projectId === project.id
                    )}
                    onDelete={handleDelete}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewProject(true)}
                  className="group rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/3 transition-all duration-200 p-8 text-center flex flex-col items-center justify-center gap-3 min-h-[180px]"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-border/70 group-hover:border-primary/50 flex items-center justify-center transition-all bg-background group-hover:bg-primary/8">
                    <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      New initiative
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Add a Digital Sales initiative
                    </p>
                  </div>
                </button>
              </div>
            )}
          </>
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
