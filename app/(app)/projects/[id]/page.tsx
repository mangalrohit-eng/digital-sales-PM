"use client"

import { use } from "react"
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
} from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: PageProps) {
  const { id } = use(params)
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

  const tabs = [
    { value: "overview",   label: "Overview",     icon: LayoutDashboard, badge: null },
    { value: "brainstorm", label: "Brainstorm",    icon: MessageSquare,   badge: null },
    { value: "generate",   label: "Generate",      icon: Sparkles,        badge: null },
    { value: "artifacts",  label: "Artifacts",     icon: FileStack,       badge: totalCount > 0 ? String(totalCount) : null },
    { value: "jira",       label: "Jira Export",   icon: ArrowUpRight,    badge: approvedCount > 0 ? String(approvedCount) : null },
  ]

  return (
    <div className="max-w-6xl">
      {/* Project header */}
      <div className="mb-7">
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

      <Tabs defaultValue="overview">
        {/* Premium tab bar */}
        <TabsList className="h-auto bg-transparent p-0 border-b border-border w-full justify-start rounded-none gap-0 mb-7">
          {tabs.map(({ value, label, icon: Icon, badge }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative flex items-center gap-2 px-5 py-3 text-[13px] font-medium rounded-none border-b-2 border-transparent bg-transparent text-muted-foreground transition-all duration-150
                data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent
                hover:text-foreground hover:bg-transparent"
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              {label}
              {badge && (
                <span className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  value === "jira"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab project={project} artifacts={artifacts} />
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
