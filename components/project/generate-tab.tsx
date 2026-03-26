"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  Layers,
  BookOpen,
  TestTube2,
  LayoutTemplate,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Artifact, ArtifactType } from "@/lib/types"
import { toast } from "sonner"

interface GenerateTabProps {
  projectId: string
  projectName: string
  croContext: string
}

interface GenerationStep {
  type: ArtifactType
  label: string
  description: string
  icon: React.ElementType
  dependsOn: ArtifactType | null
}

const STEPS: GenerationStep[] = [
  {
    type: "brd",
    label: "Business Requirements",
    description: "AI generates a comprehensive BRD from your initiative context",
    icon: FileText,
    dependsOn: null,
  },
  {
    type: "epic",
    label: "Epics",
    description: "4–5 Epics derived from the BRD, organizing the work into themes",
    icon: Layers,
    dependsOn: "brd",
  },
  {
    type: "story",
    label: "User Stories",
    description: "4–6 User Stories per Epic with acceptance criteria",
    icon: BookOpen,
    dependsOn: "epic",
  },
  {
    type: "test_case",
    label: "Test Cases",
    description: "Test cases per User Story covering functional and edge cases",
    icon: TestTube2,
    dependsOn: "story",
  },
  {
    type: "screen_layout",
    label: "Screen layouts (Figma handoff)",
    description:
      "Desktop/mobile layout spec plus JSON frames for Figma import or plugins",
    icon: LayoutTemplate,
    dependsOn: "story",
  },
]

interface StepCardProps {
  step: GenerationStep
  artifacts: Artifact[]
  allArtifacts: Artifact[]
  projectId: string
  projectName: string
  croContext: string
  onGenerated: () => void
}

function StepCard({
  step,
  artifacts,
  allArtifacts,
  projectId,
  projectName,
  croContext,
  onGenerated,
}: StepCardProps) {
  const addArtifact = useAppStore((s) => s.addArtifact)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const Icon = step.icon
  const stepArtifacts = artifacts.filter((a) => a.type === step.type)
  const isDone = stepArtifacts.length > 0

  const parentArtifacts = step.dependsOn
    ? allArtifacts.filter((a) => a.type === step.dependsOn)
    : []
  const canGenerate =
    !step.dependsOn || parentArtifacts.length > 0

  const generate = async () => {
    setLoading(true)
    setProgress(10)

    try {
      if (step.type === "brd") {
        const context = `Initiative: ${projectName}\n\n${croContext || "Digital Sales initiative for Spectrum.com"}`
        setProgress(30)
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "brd",
            context,
            title: `BRD: ${projectName}`,
          }),
        })
        setProgress(80)
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error ?? "Generation failed")
        }
        const data = await res.json()
        addArtifact({
          projectId,
          parentId: null,
          type: "brd",
          title: `BRD: ${projectName}`,
          content: data.content,
          status: "draft",
        })
        setProgress(100)
        toast.success("Business Requirements Document generated")
      } else if (step.type === "epic") {
        const brd = parentArtifacts[0]
        setProgress(20)
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "epic",
            context: brd.content,
            title: "Epics",
          }),
        })
        setProgress(80)
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error ?? "Generation failed")
        }
        const data = await res.json()
        // Parse epics — split by "**Epic" pattern
        const epicBlocks = data.content.split(/(?=\*\*Epic \d)/g).filter(Boolean)
        const count = Math.max(epicBlocks.length, 1)
        if (epicBlocks.length > 1) {
          epicBlocks.forEach((block: string, i: number) => {
            const titleMatch = block.match(/\*\*Epic \d+:\s*([^\*\n]+)\*\*/)
            const title = titleMatch ? titleMatch[1].trim() : `Epic ${i + 1}`
            addArtifact({
              projectId,
              parentId: brd.id,
              type: "epic",
              title,
              content: block.trim(),
              status: "draft",
            })
          })
        } else {
          addArtifact({
            projectId,
            parentId: brd.id,
            type: "epic",
            title: "Epics",
            content: data.content,
            status: "draft",
          })
        }
        setProgress(100)
        toast.success(`${count} Epic${count !== 1 ? "s" : ""} generated`)
      } else if (step.type === "story") {
        let totalStories = 0
        for (let i = 0; i < parentArtifacts.length; i++) {
          const epic = parentArtifacts[i]
          setProgress(Math.round(10 + (i / parentArtifacts.length) * 80))
          const res = await fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "story",
              context: epic.content,
              title: "User Stories",
            }),
          })
          if (!res.ok) {
            const d = await res.json()
            throw new Error(d.error ?? "Generation failed")
          }
          const data = await res.json()
          const storyBlocks = data.content
            .split(/(?=\*\*Story \d)/g)
            .filter(Boolean)
          if (storyBlocks.length > 1) {
            storyBlocks.forEach((block: string, j: number) => {
              const titleMatch = block.match(/\*\*Story \d+:\s*([^\*\n]+)\*\*/)
              const title = titleMatch ? titleMatch[1].trim() : `Story ${j + 1}`
              addArtifact({
                projectId,
                parentId: epic.id,
                type: "story",
                title,
                content: block.trim(),
                status: "draft",
              })
              totalStories++
            })
          } else {
            addArtifact({
              projectId,
              parentId: epic.id,
              type: "story",
              title: `Stories for ${epic.title}`,
              content: data.content,
              status: "draft",
            })
            totalStories++
          }
        }
        setProgress(100)
        toast.success(`${totalStories} User Stor${totalStories !== 1 ? "ies" : "y"} generated`)
      } else if (step.type === "test_case") {
        let totalTests = 0
        for (let i = 0; i < parentArtifacts.length; i++) {
          const story = parentArtifacts[i]
          setProgress(Math.round(10 + (i / parentArtifacts.length) * 80))
          const res = await fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "test_case",
              context: story.content,
              title: "Test Cases",
            }),
          })
          if (!res.ok) {
            const d = await res.json()
            throw new Error(d.error ?? "Generation failed")
          }
          const data = await res.json()
          addArtifact({
            projectId,
            parentId: story.id,
            type: "test_case",
            title: `Tests: ${story.title}`,
            content: data.content,
            status: "draft",
          })
          totalTests++
        }
        setProgress(100)
        toast.success(`${totalTests} Test Case set${totalTests !== 1 ? "s" : ""} generated`)
      } else if (step.type === "screen_layout") {
        const stories = allArtifacts.filter((a) => a.type === "story")
        if (stories.length === 0) {
          throw new Error("Add user stories before generating screen layouts")
        }
        const context = `Initiative: ${projectName}\n\nDigital Sales context:\n${croContext || "Digital Sales / commerce initiative"}\n\n---\n\nUser stories:\n\n${stories
          .map((s) => `### ${s.title}\n${s.content}`)
          .join("\n\n---\n\n")}`
        setProgress(25)
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "screen_layout",
            context,
            title: `Screen layouts: ${projectName}`,
          }),
        })
        setProgress(80)
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error ?? "Generation failed")
        }
        const data = await res.json()
        addArtifact({
          projectId,
          parentId: null,
          type: "screen_layout",
          title: `Screen layouts: ${projectName}`,
          content: data.content,
          status: "draft",
        })
        setProgress(100)
        toast.success("Screen layout spec generated — export JSON from the Export tab")
      }

      onGenerated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed"
      toast.error(msg)
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 1500)
    }
  }

  return (
    <Card
      className={`transition-all ${
        isDone
          ? "border-emerald-200 bg-emerald-50/50"
          : canGenerate
          ? "hover:border-primary/30"
          : "opacity-60"
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDone
                ? "bg-emerald-100"
                : canGenerate
                ? "bg-primary/10"
                : "bg-muted"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${
                isDone
                  ? "text-emerald-600"
                  : canGenerate
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{step.label}</h3>
              {isDone && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-auto py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  {stepArtifacts.length} generated
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {step.description}
            </p>

            {loading && (
              <div className="mb-3">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Generating with GPT-4o...
                </p>
              </div>
            )}

            {!canGenerate && step.dependsOn && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Info className="w-3.5 h-3.5" />
                <span>
                  Generate{" "}
                  {step.dependsOn === "brd"
                    ? "Business Requirements"
                    : step.dependsOn === "epic"
                      ? "Epics"
                      : "User Stories"}{" "}
                  first
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isDone ? "outline" : "default"}
                className="gap-1.5 h-8 text-xs"
                onClick={generate}
                disabled={loading || !canGenerate}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : isDone ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate
                  </>
                )}
              </Button>
              {isDone && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  Review in Artifacts tab
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function GenerateTab({
  projectId,
  projectName,
  croContext,
}: GenerateTabProps) {
  const { getArtifactsByProject } = useAppStore()
  const [tick, setTick] = useState(0)
  const artifacts = getArtifactsByProject(projectId)

  const totalGenerated = artifacts.length
  const progress = STEPS.filter(
    (s) => artifacts.some((a) => a.type === s.type)
  ).length

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Generate Artifacts</h2>
          <span className="text-xs text-muted-foreground">
            {progress}/{STEPS.length} steps complete
          </span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.type}
              className={`h-1 flex-1 rounded-full transition-all ${
                artifacts.some((a) => a.type === s.type)
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Generate your full artifact hierarchy in sequence — each step builds
          on the previous one. You can regenerate any step at any time.
        </p>
      </div>

      {totalGenerated > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-primary">
            <span className="font-semibold">{totalGenerated} artifact{totalGenerated !== 1 ? "s" : ""}</span> generated.
            Review in <span className="font-semibold">Artifacts</span>; export from <span className="font-semibold">Export</span>.
          </p>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step) => (
          <StepCard
            key={step.type}
            step={step}
            artifacts={artifacts}
            allArtifacts={artifacts}
            projectId={projectId}
            projectName={projectName}
            croContext={croContext}
            onGenerated={() => setTick((t) => t + 1)}
          />
        ))}
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/60 text-xs text-muted-foreground">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          Generation uses GPT-4o and may take 10–30 seconds per step. Ensure
          your OpenAI API key is configured in Settings.
        </p>
      </div>
    </div>
  )
}
