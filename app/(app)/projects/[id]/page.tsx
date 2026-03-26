"use client"

import { use, useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewTab } from "@/components/project/overview-tab"
import { BrainstormTab } from "@/components/project/brainstorm-tab"
import { GenerateTab } from "@/components/project/generate-tab"
import { ArtifactsTab } from "@/components/project/artifacts-tab"
import { JiraTab } from "@/components/project/jira-tab"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  FileStack,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

const TAB_VALUES = [
  "overview",
  "brainstorm",
  "generate",
  "artifacts",
  "jira",
] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v)
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { getProject, getArtifactsByProject } = useAppStore()

  const project = getProject(id)
  const artifacts = getArtifactsByProject(id)

  const user = session?.user as
    | { name: string; role: string; title: string }
    | undefined

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <p className="font-semibold mb-2">Initiative not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            This initiative may have been deleted.
          </p>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const approvedCount = artifacts.filter((a) => a.status === "approved").length
  const totalCount = artifacts.length
  const inReviewCount = artifacts.filter((a) => a.status === "in_review").length

  const activeTab = useMemo((): TabValue => {
    const t = searchParams.get("tab")
    return isTabValue(t) ? t : "brainstorm"
  }, [searchParams])

  const setTab = useCallback(
    (value: string) => {
      const v: TabValue = isTabValue(value) ? value : "brainstorm"
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", v)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const workflowStep = useMemo(() => {
    const hasChat =
      project.chatHistory.some((m) => m.role === "assistant") ?? false
    if (totalCount > 0) return 2
    if (hasChat) return 1
    return 0
  }, [project.chatHistory, totalCount])

  const tabs = [
    { value: "overview", label: "Overview", icon: LayoutDashboard, badge: null, workflow: false },
    {
      value: "brainstorm",
      label: "Brainstorm",
      icon: MessageSquare,
      badge: null,
      workflow: true,
    },
    {
      value: "generate",
      label: "Generate",
      icon: Sparkles,
      badge: null,
      workflow: true,
    },
    {
      value: "artifacts",
      label: "Artifacts",
      icon: FileStack,
      badge: totalCount > 0 ? String(totalCount) : null,
      workflow: true,
    },
    {
      value: "jira",
      label: "Jira Export",
      icon: ArrowUpRight,
      badge: approvedCount > 0 ? String(approvedCount) : null,
      workflow: false,
    },
  ]

  return (
    <div className="max-w-6xl">
      {/* Project header */}
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] mb-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Dashboard
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-semibold truncate max-w-xs">{project.name}</span>
        </div>

        {/* Project title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight mb-1.5 truncate">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          {/* Status chips */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 border border-border/60 text-[12px] font-medium text-muted-foreground">
                <FileStack className="w-3.5 h-3.5" />
                {totalCount} artifact{totalCount !== 1 ? "s" : ""}
              </div>
              {approvedCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {approvedCount} approved
                </div>
              )}
              {inReviewCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-medium text-amber-700">
                  {inReviewCount} in review
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workflow rail */}
      <div className="mb-6 rounded-xl border border-border/80 bg-card/80 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Core workflow
            </p>
            <p className="text-sm text-foreground/90 mt-0.5">
              Brainstorm → Generate → Refine artifacts → Export to Jira
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {(["Brainstorm", "Generate", "Artifacts"] as const).map((label, i) => (
              <span key={label} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-border shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setTab(
                      i === 0 ? "brainstorm" : i === 1 ? "generate" : "artifacts"
                    )
                  }
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    (i === 0 && activeTab === "brainstorm") ||
                    (i === 1 && activeTab === "generate") ||
                    (i === 2 && activeTab === "artifacts")
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : i <= workflowStep
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="h-auto bg-muted/40 p-1 border border-border/60 w-full justify-start rounded-lg gap-0 mb-6 flex-wrap">
          {tabs.map(({ value, label, icon: Icon, badge, workflow }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-md border border-transparent transition-all duration-150
                data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border/80
                text-muted-foreground hover:text-foreground
                ${workflow ? "data-[state=active]:ring-1 data-[state=active]:ring-primary/20" : ""}`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              {label}
              {workflow && (
                <span className="sr-only">workflow step</span>
              )}
              {badge && (
                <span
                  className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                    value === "jira"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab
            project={project}
            artifacts={artifacts}
            onNavigate={setTab}
          />
        </TabsContent>

        <TabsContent value="brainstorm" className="mt-0">
          <BrainstormTab
            projectId={id}
            projectName={project.name}
            croContext={project.cro_context}
            userName={user?.name ?? "User"}
          />
        </TabsContent>

        <TabsContent value="generate" className="mt-0">
          <GenerateTab
            projectId={id}
            projectName={project.name}
            croContext={project.cro_context}
          />
        </TabsContent>

        <TabsContent value="artifacts" className="mt-0">
          <ArtifactsTab
            projectId={id}
            userRole={user?.role ?? "analyst"}
            userName={user?.name ?? "User"}
          />
        </TabsContent>

        <TabsContent value="jira" className="mt-0">
          <JiraTab
            projectId={id}
            userRole={user?.role ?? "analyst"}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
