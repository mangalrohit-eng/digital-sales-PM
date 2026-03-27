"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import type { Artifact, ArtifactType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  LayoutTemplate,
  Copy,
  Download,
  FileCode,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { ARTIFACT_TYPE_LABELS } from "@/lib/types"
import { extractFigmaHandoffObject } from "@/lib/figma-handoff"
import { isPublishedToLibrary } from "@/lib/artifact-published"

const JIRA_TYPES: ArtifactType[] = ["brd", "epic", "story", "test_case"]

/** Confluence: initiative brief + BRD as wiki/Markdown paste (backlog items use Jira). */
const CONFLUENCE_PASTE_TYPES: ArtifactType[] = ["initiative_brief", "brd"]

const TYPE_ICONS: Record<ArtifactType, React.ElementType> = {
  initiative_brief: Sparkles,
  brd: FileText,
  epic: Layers,
  story: BookOpen,
  test_case: TestTube2,
  screen_layout: LayoutTemplate,
}

interface ExportTabProps {
  projectId: string
  userRole: string
}

interface TicketResult {
  artifactId: string
  ticketId: string
  url: string
}

function markdownToConfluenceWiki(md: string): string {
  let t = md
  t = t.replace(/^#### (.+)$/gm, "h4. $1")
  t = t.replace(/^### (.+)$/gm, "h3. $1")
  t = t.replace(/^## (.+)$/gm, "h2. $1")
  t = t.replace(/^# (.+)$/gm, "h1. $1")
  t = t.replace(/\*\*(.+?)\*\*/g, "*$1*")
  t = t.replace(/^- (.+)$/gm, "* $1")
  t = t.replace(/^(\d+)\. (.+)$/gm, "# $1 $2")
  return t
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportTab({ projectId, userRole }: ExportTabProps) {
  const { getArtifactsByProject, updateArtifact } = useAppStore()
  const [pushing, setPushing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentItem, setCurrentItem] = useState("")
  const [results, setResults] = useState<TicketResult[]>([])

  const artifacts = getArtifactsByProject(projectId).filter(isPublishedToLibrary)
  const approvedArtifacts = artifacts.filter((a) => a.status === "approved")
  const jiraEligible = approvedArtifacts.filter((a) =>
    JIRA_TYPES.includes(a.type)
  )
  const alreadyPushed = jiraEligible.filter((a) => a.jiraTicketId)
  const readyToPush = jiraEligible.filter((a) => !a.jiraTicketId)
  const layoutArtifacts = artifacts.filter((a) => a.type === "screen_layout")
  const confluenceArtifacts = artifacts.filter((a) =>
    CONFLUENCE_PASTE_TYPES.includes(a.type)
  )

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

      toast.success(
        `Filed ${readyToPush.length} ticket${readyToPush.length !== 1 ? "s" : ""} in Jira`
      )
    } catch {
      toast.error("Jira push failed. Please try again.")
    } finally {
      setPushing(false)
      setCurrentItem("")
    }
  }

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy")
    }
  }

  const canPushJira = userRole === "admin"

  if (artifacts.length === 0) {
    return (
      <div className="workbench-pane-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 text-center">
        <div className="max-w-sm">
          <Send className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No artifacts yet</h3>
          <p className="text-sm text-muted-foreground">
            Generate requirements first, then push approved work to Jira or download
            Figma handoff JSON.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl min-w-0 flex-1 flex-col overflow-hidden">
      <div className="workbench-pane-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="space-y-8 pr-1">
      <div>
        <h2 className="text-lg font-semibold mb-1">Export</h2>
        <p className="text-sm text-muted-foreground">
          Approved <strong className="font-medium text-foreground/90">epics, stories, tests, and BRDs</strong> are{" "}
          <strong className="font-medium text-foreground/90">filed in Jira</strong>. Screen layouts export as JSON for
          Figma. If you document BRDs in Confluence, use the section below to copy wiki or Markdown—backlog items belong in Jira, not Confluence.
        </p>
      </div>

      {/* Jira */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-600" />
            Jira
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Epics, stories, tests, and BRDs become Jira issues. Screen layouts use the Figma card below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Jira-eligible", value: jiraEligible.length },
              { label: "Approved & ready", value: readyToPush.length },
              { label: "Already in Jira", value: alreadyPushed.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-muted/30 p-3 text-center"
              >
                <p className="text-xl font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {!canPushJira && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Only <strong>Admin</strong> can push to Jira.
              </p>
            </div>
          )}

          {readyToPush.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Ready to push ({readyToPush.length})
                </h3>
                {canPushJira && (
                  <Button onClick={pushToJira} disabled={pushing} className="gap-2">
                    {pushing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Pushing…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Push to Jira
                      </>
                    )}
                  </Button>
                )}
              </div>

              {pushing && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary font-medium">
                      Creating Jira tickets…
                    </span>
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {currentItem && (
                    <p className="text-xs text-muted-foreground truncate">
                      {currentItem}
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                        result
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-background border-border"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{artifact.title}</span>
                      {result ? (
                        <Badge
                          variant="outline"
                          className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200"
                        >
                          {result.ticketId}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
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

          {alreadyPushed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                In Jira
              </h3>
              {alreadyPushed.map((artifact) => {
                const Icon = TYPE_ICONS[artifact.type]
                return (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40"
                  >
                    <Icon className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="flex-1 text-sm truncate">{artifact.title}</span>
                    <Badge
                      variant="outline"
                      className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200"
                    >
                      {artifact.jiraTicketId}
                    </Badge>
                    <a
                      href={`https://example.atlassian.net/browse/${artifact.jiraTicketId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      title="Open in Jira"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Figma */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-violet-600" />
            Figma
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Screen layout artifacts include structured JSON (frames, auto-layout
            hints). Download and import with your Figma plugin, or recreate from
            the markdown spec.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {layoutArtifacts.length === 0 ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Run <strong>Frame</strong> for screen layouts (Figma handoff) in the
                Agents tab after user stories exist.
              </p>
            </div>
          ) : (
            layoutArtifacts.map((artifact) => {
              const parsed = extractFigmaHandoffObject(artifact.content)
              const payload =
                parsed ??
                ({
                  figmaHandoffVersion: "1.0",
                  document: {
                    name: artifact.title,
                    note: "No JSON fence found; export full markdown separately.",
                    rawExcerpt: artifact.content.slice(0, 2000),
                  },
                } as const)

              return (
                <div
                  key={artifact.id}
                  className="rounded-xl border border-border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{artifact.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ARTIFACT_TYPE_LABELS[artifact.type]}
                        {artifact.status !== "approved" && (
                          <span className="text-amber-600">
                            {" "}
                            · Approve in Artifacts for a clean handoff record
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() =>
                        downloadJson(
                          `${artifact.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-figma-handoff.json`,
                          payload
                        )
                      }
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download JSON
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() =>
                        copyText(
                          "Layout spec",
                          typeof payload === "object"
                            ? JSON.stringify(payload, null, 2)
                            : String(payload)
                        )
                      }
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy JSON
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => copyText("Markdown spec", artifact.content)}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Copy full spec
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Confluence — BRD documentation only; epics/stories export via Jira */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Confluence (BRD only)
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Optional: paste an approved BRD into a Confluence page as wiki markup or
            Markdown. Do not use this for epics or stories—those go to Jira.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {confluenceArtifacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No BRD in the library yet. Finalize a BRD in the workspace, then copy
              it here if your team keeps requirements in Confluence.
            </p>
          ) : (
            confluenceArtifacts.map((artifact) => {
              const Icon = TYPE_ICONS[artifact.type]
              const wiki = markdownToConfluenceWiki(artifact.content)
              return (
                <div
                  key={artifact.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{artifact.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {ARTIFACT_TYPE_LABELS[artifact.type]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => copyText("Confluence wiki", wiki)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Wiki
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => copyText("Markdown", artifact.content)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Markdown
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  )
}
