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
  Send,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

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
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const approvedCount = artifacts.filter((a) => a.status === "approved").length
  const totalCount = artifacts.length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium truncate max-w-xs">{project.name}</span>
        {totalCount > 0 && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {approvedCount}/{totalCount} approved
            </span>
          </>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-0">
        <TabsList className="h-auto p-1 gap-0.5 mb-6 w-full justify-start bg-muted/60">
          {[
            { value: "overview", label: "Overview", icon: LayoutDashboard },
            { value: "brainstorm", label: "Brainstorm", icon: MessageSquare },
            { value: "generate", label: "Generate", icon: Sparkles },
            { value: "artifacts", label: "Artifacts", icon: FileStack },
            { value: "jira", label: "Jira Export", icon: Send },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-2 text-sm px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {value === "artifacts" && totalCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1.5 text-[10px] min-w-4 text-center"
                >
                  {totalCount}
                </Badge>
              )}
              {value === "jira" && approvedCount > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] min-w-4 text-center bg-emerald-500">
                  {approvedCount}
                </Badge>
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
