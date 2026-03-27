"use client"

import { use, useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { OverviewTab } from "@/components/project/overview-tab"
import { BrainstormTab } from "@/components/project/brainstorm-tab"
import { AgentWorkspaceTab } from "@/components/project/agent-workspace-tab"
import { ArtifactsTab } from "@/components/project/artifacts-tab"
import { ExportTab } from "@/components/project/export-tab"
import { WORKSPACE_AGENT_STEPS } from "@/lib/workspace-generation"
import { isPublishedToLibrary } from "@/lib/artifact-published"
import {
  LayoutDashboard,
  MessageSquare,
  FileStack,
  Share2,
} from "lucide-react"
import Link from "next/link"
import { WorkbenchFloatingNav } from "@/components/project/workbench-floating-nav"

const CORE_TABS = ["overview", "brainstorm"] as const
const TAIL_TABS = ["artifacts", "export"] as const
const AGENT_TAB_VALUES = WORKSPACE_AGENT_STEPS.map((s) => s.tab)
const TAB_VALUES = [
  ...CORE_TABS,
  ...AGENT_TAB_VALUES,
  ...TAIL_TABS,
] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v)
}

function normalizeTabParam(v: string | null): string | null {
  if (v === "jira") return "export"
  if (v === "generate") return "agent-brd"
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
  const libraryArtifacts = useMemo(
    () => artifacts.filter(isPublishedToLibrary),
    [artifacts]
  )

  const user = session?.user as
    | { name: string; role: string; title: string }
    | undefined

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-center px-4">
        <div className="max-w-sm">
          <p className="font-semibold text-lg mb-2">Initiative not found</p>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            It may have been removed, or the link is outdated. Your other
            initiatives are still available from the list.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              All initiatives
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalCount = libraryArtifacts.length
  const jiraPushedCount = libraryArtifacts.filter(
    (a) =>
      a.jiraTicketId &&
      ["brd", "epic", "story", "test_case"].includes(a.type)
  ).length

  const draftBriefCount = artifacts.filter(
    (a) => a.type === "initiative_brief" && a.published === false
  ).length

  const draftWorkspaceCount = (t: (typeof WORKSPACE_AGENT_STEPS)[number]["type"]) =>
    artifacts.filter((a) => a.type === t && a.published === false).length

  const activeTab = useMemo((): TabValue => {
    const t = normalizeTabParam(searchParams.get("tab"))
    return isTabValue(t) ? t : "overview"
  }, [searchParams])

  const setTab = useCallback(
    (value: string) => {
      const v: TabValue = isTabValue(value) ? value : "overview"
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", v)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const tabs = [
    {
      value: "overview" as const,
      label: "Overview",
      icon: LayoutDashboard,
      badge: null as string | null,
      step: null as number | null,
    },
    {
      value: "brainstorm" as const,
      label: "Discovery",
      icon: MessageSquare,
      badge: draftBriefCount > 0 ? String(draftBriefCount) : null,
      step: 1,
    },
    ...WORKSPACE_AGENT_STEPS.map((s) => ({
      value: s.tab as TabValue,
      label: s.navLabel,
      icon: s.icon,
      badge:
        draftWorkspaceCount(s.type) > 0
          ? String(draftWorkspaceCount(s.type))
          : null,
      step: null as number | null,
    })),
    {
      value: "artifacts" as const,
      label: "Artifacts",
      icon: FileStack,
      badge: totalCount > 0 ? String(totalCount) : null,
      step: 2,
    },
    {
      value: "export" as const,
      label: "Export",
      icon: Share2,
      badge: jiraPushedCount > 0 ? String(jiraPushedCount) : null,
      step: null,
    },
  ]

  const tabPanelClass =
    "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none"

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl min-w-0 flex-col">
      <Tabs
        value={activeTab}
        onValueChange={setTab}
        className="workbench-tabs flex min-h-0 flex-1 flex-col"
      >
        <WorkbenchFloatingNav projectName={project.name} tabs={tabs} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[6.875rem] sm:pt-[8.125rem]">
          <TabsContent value="overview" className={tabPanelClass}>
            <OverviewTab
              project={project}
              artifacts={artifacts}
              onNavigate={setTab}
            />
          </TabsContent>

          <TabsContent value="brainstorm" className={tabPanelClass}>
            <BrainstormTab
              projectId={id}
              projectName={project.name}
              croContext={project.cro_context}
              userName={user?.name ?? "User"}
            />
          </TabsContent>

          {WORKSPACE_AGENT_STEPS.map((s) => (
            <TabsContent key={s.tab} value={s.tab} className={tabPanelClass}>
              <AgentWorkspaceTab
                projectId={id}
                projectName={project.name}
                croContext={project.cro_context}
                userName={user?.name ?? "User"}
                step={s}
              />
            </TabsContent>
          ))}

          <TabsContent value="artifacts" className={tabPanelClass}>
            <ArtifactsTab
              projectId={id}
              userRole={user?.role ?? "analyst"}
              userName={user?.name ?? "User"}
            />
          </TabsContent>

          <TabsContent value="export" className={tabPanelClass}>
            <ExportTab
              projectId={id}
              userRole={user?.role ?? "analyst"}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
