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
      label: "Sage",
      icon: MessageSquare,
      badge: null,
      workflow: true,
      step: 1,
    },
    {
      value: "generate",
      label: "Agents",
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
              Sage → agent pipeline → Quill → Courier (Jira, Figma, Confluence)
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Named agents run discovery, generation, refinement, and delivery.
              Follow the tabs in order for the main demo path.
            </p>
            <div className="mt-4 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Quick jump
              </p>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-1">
                {(
                  ["brainstorm", "generate", "artifacts", "export"] as const
                ).map((key, i) => (
                  <span key={key} className="inline-flex items-center gap-1">
                    {i > 0 && (
                      <ChevronRight
                        className="mx-0.5 h-3.5 w-3.5 shrink-0 text-primary/35"
                        aria-hidden
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setTab(key)}
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        activeTab === key
                          ? "bg-primary text-primary-foreground shadow-md"
                          : key === "export"
                            ? "border border-border/80 bg-background/90 hover:bg-muted"
                            : i <= workflowStep
                              ? "bg-primary/15 text-primary hover:bg-primary/25"
                              : "border border-border/80 bg-background/90 hover:bg-muted"
                      }`}
                    >
                      {key === "brainstorm"
                        ? "Sage"
                        : key === "generate"
                          ? "Agents"
                          : key === "artifacts"
                            ? "Artifacts"
                            : "Export"}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <TabsList className="grid h-auto min-h-0 w-full grid-cols-2 gap-2 rounded-xl border border-border/80 bg-background/70 p-2 shadow-inner sm:grid-cols-3 lg:grid-cols-5 sm:p-2.5 [&_[data-slot=tabs-trigger]]:w-full [&_[data-slot=tabs-trigger]]:max-w-none">
              {tabs.map(({ value, label, icon: Icon, badge, workflow, step }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="group box-border flex min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-transparent px-2 py-2.5 text-center text-sm font-semibold transition-all duration-200 sm:min-h-[3.5rem] sm:flex-row sm:gap-2 sm:px-3 sm:text-[15px] data-active:border-primary/40 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-lg data-active:shadow-primary/25 data-active:[&_.workflow-step-num]:bg-white/25 data-active:[&_.workflow-step-num]:text-primary-foreground data-active:[&_svg]:opacity-100 data-active:[&_.workflow-tab-badge]:bg-white/20 data-active:[&_.workflow-tab-badge]:text-primary-foreground text-foreground/80 hover:bg-muted/90 hover:text-foreground"
                >
                  <div className="flex min-w-0 items-center justify-center gap-2 sm:contents">
                    {step != null && (
                      <span
                        className="workflow-step-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary sm:h-8 sm:w-8 sm:text-sm"
                      >
                        {step}
                      </span>
                    )}
                    <Icon
                      className="h-4 w-4 shrink-0 opacity-80 sm:h-5 sm:w-5"
                      strokeWidth={2}
                    />
                    <span className="min-w-0 max-w-full text-center leading-tight break-words [overflow-wrap:anywhere] sm:max-w-[7rem] lg:max-w-none">
                      {label}
                    </span>
                  </div>
                  {badge && (
                    <span
                      className={`workflow-tab-badge mt-0.5 inline-flex min-h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold sm:ml-0.5 sm:mt-0
                      ${value === "export" ? "bg-emerald-100 text-emerald-800 data-active:bg-white/20 data-active:text-primary-foreground" : "bg-muted text-muted-foreground"}`}
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
