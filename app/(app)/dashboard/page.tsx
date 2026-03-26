"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useAppStore } from "@/lib/store"
import { InitiativesPanel } from "@/components/dashboard/initiatives-panel"
import { Button } from "@/components/ui/button"
import {
  Plus,
  FolderKanban,
  FileStack,
  CheckCircle2,
  TrendingUp,
} from "lucide-react"

export default function DashboardPage() {
  const { data: session } = useSession()
  const { projects, artifacts } = useAppStore()
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const user = session?.user as
    | { name: string; role: string; title: string }
    | undefined

  const totalArtifacts = artifacts.length
  const approvedArtifacts = artifacts.filter((a) => a.status === "approved")
    .length
  const inReviewArtifacts = artifacts.filter((a) => a.status === "in_review")
    .length
  const activeProjects = projects.filter((p) => p.status === "active").length

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = user?.name?.split(" ")[0] ?? "there"

  const stats = [
    {
      icon: FolderKanban,
      label: "Active initiatives",
      value: activeProjects,
      trend: null,
      colorClass: "stat-blue",
      iconColor: "text-primary",
    },
    {
      icon: FileStack,
      label: "Artifacts generated",
      value: totalArtifacts,
      trend: null,
      colorClass: "stat-amber",
      iconColor: "text-amber-500",
    },
    {
      icon: CheckCircle2,
      label: "Approved",
      value: approvedArtifacts,
      trend:
        approvedArtifacts > 0 ? `${inReviewArtifacts} in review` : null,
      colorClass: "stat-emerald",
      iconColor: "text-emerald-500",
    },
  ]

  return (
    <>
      <div className="space-y-8">
        {/* Hero banner */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.165 0.040 254) 0%, oklch(0.22 0.07 256) 60%, oklch(0.28 0.10 260) 100%)",
            boxShadow: "0 4px 24px oklch(0.50 0.19 254 / 0.20)",
          }}
        >
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, oklch(0.60 0.19 254) 0%, transparent 70%)",
              transform: "translate(30%, -40%)",
            }}
          />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-white/50 text-sm font-medium mb-1.5">
                {greeting}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                {firstName}
              </h1>
              <p className="text-white/45 text-sm max-w-md">
                {activeProjects === 0
                  ? "Start your first Digital Sales initiative to generate AI-powered artifacts for Spectrum.com."
                  : `You have ${activeProjects} active initiative${activeProjects !== 1 ? "s" : ""} — ${totalArtifacts} artifact${totalArtifacts !== 1 ? "s" : ""} generated.`}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setNewProjectOpen(true)}
              className="shrink-0 bg-white text-[oklch(0.165_0.040_254)] hover:bg-white/90 font-semibold gap-2 shadow-xl h-10 px-5 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              New initiative
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(
            ({ icon: Icon, label, value, trend, colorClass, iconColor }) => (
              <div
                key={label}
                className={`rounded-2xl p-5 border border-border/60 ${colorClass} card-elevated`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2 rounded-xl bg-background/60 ${iconColor}`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  {trend && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5 font-medium">
                      <TrendingUp className="w-3 h-3" />
                      {trend}
                    </div>
                  )}
                </div>
                <p className="text-4xl font-bold text-foreground tracking-tight leading-none mb-1.5">
                  {value}
                </p>
                <p className="text-[13px] text-muted-foreground font-medium">
                  {label}
                </p>
              </div>
            )
          )}
        </div>

        <InitiativesPanel
          variant="dashboard"
          newProjectDialogOpen={newProjectOpen}
          onNewProjectDialogOpenChange={setNewProjectOpen}
        />
      </div>
    </>
  )
}
