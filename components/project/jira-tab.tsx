"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Artifact } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  FileText,
  Layers,
  BookOpen,
  TestTube2,
  AlertCircle,
  Send,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { ArtifactType } from "@/lib/types"

const TYPE_ICONS: Record<ArtifactType, React.ElementType> = {
  brd: FileText,
  epic: Layers,
  story: BookOpen,
  test_case: TestTube2,
}

interface JiraTabProps {
  projectId: string
  userRole: string
}

interface TicketResult {
  artifactId: string
  ticketId: string
  url: string
}

export function JiraTab({ projectId, userRole }: JiraTabProps) {
  const { getArtifactsByProject, updateArtifact } = useAppStore()
  const [pushing, setPushing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentItem, setCurrentItem] = useState("")
  const [results, setResults] = useState<TicketResult[]>([])

  const artifacts = getArtifactsByProject(projectId)
  const approvedArtifacts = artifacts.filter((a) => a.status === "approved")
  const alreadyPushed = artifacts.filter((a) => a.jiraTicketId)
  const readyToPush = approvedArtifacts.filter((a) => !a.jiraTicketId)

  const pushToJira = async () => {
    if (readyToPush.length === 0) return
    setPushing(true)
    setProgress(0)
    setResults([])

    try {
      for (let i = 0; i < readyToPush.length; i++) {
        const artifact = readyToPush[i]
        setCurrentItem(artifact.title)
        setProgress(Math.round(((i + 0.5) / readyToPush.length) * 100))

        const res = await fetch("/api/jira/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artifactIds: [artifact.id] }),
        })

        if (!res.ok) throw new Error("Jira push failed")
        const data = await res.json()
        const ticket = data.tickets[0]

        updateArtifact(artifact.id, { jiraTicketId: ticket.ticketId })
        setResults((prev) => [...prev, ticket])
        setProgress(Math.round(((i + 1) / readyToPush.length) * 100))
      }

      toast.success(`${readyToPush.length} ticket${readyToPush.length !== 1 ? "s" : ""} created in Jira`)
    } catch {
      toast.error("Jira push failed. Please try again.")
    } finally {
      setPushing(false)
      setCurrentItem("")
    }
  }

  const canPush = userRole === "admin"

  if (artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <Send className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No artifacts yet</h3>
          <p className="text-sm text-muted-foreground">
            Generate and approve artifacts before pushing to Jira.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-semibold mb-1">Push to Jira</h2>
        <p className="text-sm text-muted-foreground">
          Only approved artifacts can be pushed. Each artifact creates a ticket
          in the SPEC project.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total artifacts",
            value: artifacts.length,
            color: "text-foreground",
            bg: "bg-muted",
          },
          {
            label: "Approved",
            value: approvedArtifacts.length,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
          {
            label: "Pushed to Jira",
            value: alreadyPushed.length,
            color: "text-sky-700",
            bg: "bg-sky-50",
          },
        ].map(({ label, value, color, bg }) => (
          <Card key={label}>
            <CardContent className={`p-4 text-center ${bg} rounded-xl`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role restriction */}
      {!canPush && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Only <strong>Admin</strong> users can push to Jira. Ask your
            administrator to initiate the push.
          </p>
        </div>
      )}

      {/* Ready to push */}
      {readyToPush.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Ready to push ({readyToPush.length})
            </h3>
            {canPush && (
              <Button
                onClick={pushToJira}
                disabled={pushing}
                className="gap-2"
              >
                {pushing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Push {readyToPush.length} ticket{readyToPush.length !== 1 ? "s" : ""} to Jira
                  </>
                )}
              </Button>
            )}
          </div>

          {pushing && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary font-medium">
                  Creating Jira tickets...
                </span>
                <span className="text-muted-foreground text-xs">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentItem && (
                <p className="text-xs text-muted-foreground truncate">
                  Processing: {currentItem}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {readyToPush.map((artifact) => {
              const Icon = TYPE_ICONS[artifact.type]
              const result = results.find((r) => r.artifactId === artifact.id)
              return (
                <div
                  key={artifact.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                    result
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-background border-border"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${result ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <span className="flex-1 text-sm truncate">{artifact.title}</span>
                  {result ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <Badge
                        variant="outline"
                        className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200"
                      >
                        {result.ticketId}
                      </Badge>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0"
                    >
                      Approved
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Already pushed */}
      {alreadyPushed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Previously pushed ({alreadyPushed.length})
          </h3>
          <div className="space-y-2">
            {alreadyPushed.map((artifact) => {
              const Icon = TYPE_ICONS[artifact.type]
              return (
                <div
                  key={artifact.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50/50"
                >
                  <Icon className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="flex-1 text-sm truncate">{artifact.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <Badge
                      variant="outline"
                      className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200"
                    >
                      {artifact.jiraTicketId}
                    </Badge>
                    <a
                      href={`https://charter.atlassian.net/browse/${artifact.jiraTicketId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unapproved warning */}
      {artifacts.filter((a) => a.status !== "approved" && !a.jiraTicketId).length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/60 border border-border">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {artifacts.filter((a) => a.status !== "approved" && !a.jiraTicketId).length} artifact{artifacts.filter((a) => a.status !== "approved" && !a.jiraTicketId).length !== 1 ? "s" : ""}
            </span>{" "}
            are not yet approved. Approve them in the Artifacts tab to include
            them in the Jira push.
          </p>
        </div>
      )}
    </div>
  )
}
