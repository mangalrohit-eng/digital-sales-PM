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
import { ExportTab } from "@/components/project/export-tab"
import {
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  FileStack,
  Share2,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

const TAB_VALUES = [
  "overview",
  "brainstorm",
  "generate",
  "artifacts",
  "export",
] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v)
}

function normalizeTabParam(v: string | null): string | null {
  if (v === "jira") return "export"
  return v
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
  const jiraPushedCount = artifacts.filter(
    (a) =>
      a.jiraTicketId &&
      ["brd", "epic", "story", "test_case"].includes(a.type)
  ).length

  const activeTab = useMemo((): TabValue => {
    const t = normalizeTabParam(searchParams.get("tab"))
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
    {
      value: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      badge: null,
      workflow: false,
      step: null as number | null,
    },
    {
      value: "brainstorm",
      label: "Brainstorm",
      icon: MessageSquare,
      badge: null,
      workflow: true,
      step: 1,
    },
    {
      value: "generate",
      label: "Generate",
      icon: Sparkles,
      badge: null,
      workflow: true,
      step: 2,
    },
    {
      value: "artifacts",
      label: "Artifacts",
      icon: FileStack,
      badge: totalCount > 0 ? String(totalCount) : null,
      workflow: true,
      step: 3,
    },
    {
      value: "export",
      label: "Export",
      icon: Share2,
      badge: jiraPushedCount > 0 ? String(jiraPushedCount) : null,
      workflow: false,
      step: null,
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

      <Tabs value={activeTab} onValueChange={setTab}>
        {/* Primary demo focus: workflow navigation */}
        <div className="mb-8 rounded-2xl border-2 border-primary/35 bg-gradient-to-br from-primary/[0.12] via-card to-muted/40 shadow-lg shadow-primary/10 ring-1 ring-primary/15 overflow-hidden">
          <div className="border-b border-primary/15 bg-primary/[0.06] px-4 py-4 sm:px-6 sm:py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Demo workflow
            </p>
            <p className="text-base sm:text-lg font-semibold text-foreground mt-1.5 leading-snug">
              Brainstorm → Generate → Artifacts → Export (Jira, Figma, Confluence)
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Use the steps below in order; this is the main path reviewers follow in the demo.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-medium text-muted-foreground">
              <span>Quick jump:</span>
              {(
                ["brainstorm", "generate", "artifacts", "export"] as const
              ).map((key, i) => (
                <span key={key} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-primary/40" />}
                  <button
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-full px-3 py-1.5 transition-colors ${
                      activeTab === key
                        ? "bg-primary text-primary-foreground shadow-md"
                        : key === "export"
                          ? "bg-background/80 border border-border/80 hover:bg-muted"
                          : i <= workflowStep
                            ? "bg-primary/15 text-primary hover:bg-primary/25"
                            : "bg-background/80 border border-border/80 hover:bg-muted"
                    }`}
                  >
                    {key === "brainstorm"
                      ? "Brainstorm"
                      : key === "generate"
                        ? "Generate"
                        : key === "artifacts"
                          ? "Artifacts"
                          : "Export"}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <TabsList className="h-auto w-full flex flex-wrap gap-2 sm:gap-2.5 justify-start rounded-xl bg-background/70 p-2 sm:p-2.5 border border-border/80 shadow-inner">
              {tabs.map(({ value, label, icon: Icon, badge, workflow, step }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={`group relative flex min-h-[52px] flex-1 basis-[calc(50%-0.25rem)] sm:basis-0 sm:flex-none items-center justify-center gap-2.5 rounded-xl border-2 border-transparent px-4 sm:px-5 py-3 text-[15px] sm:text-base font-semibold transition-all duration-200
                    data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25
                    text-foreground/80 hover:bg-muted/90 hover:text-foreground
                    ${workflow ? "sm:min-w-[9.5rem]" : "sm:min-w-[7.5rem]"}`}
                >
                  {step != null && (
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary
                      group-data-[state=active]:bg-white/25 group-data-[state=active]:text-primary-foreground"
                    >
                      {step}
                    </span>
                  )}
                  <Icon
                    className="h-5 w-5 shrink-0 opacity-80 group-data-[state=active]:opacity-100"
                    strokeWidth={2}
                  />
                  <span className="whitespace-nowrap">{label}</span>
                  {badge && (
                    <span
                      className={`ml-0.5 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold
                      group-data-[state=active]:bg-white/20 group-data-[state=active]:text-primary-foreground
                      ${value === "export" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
                    >
                      {badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

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

        <TabsContent value="export" className="mt-0">
          <ExportTab
            projectId={id}
            userRole={user?.role ?? "analyst"}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
