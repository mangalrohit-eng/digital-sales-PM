"use client"

import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { ArtifactType } from "@/lib/types"
import { ARTIFACT_TYPE_LABELS } from "@/lib/types"
import { AGENT_SCOUT, getAgentForArtifactType } from "@/lib/agents"
import { PROMPT_PLACEHOLDER_HELP } from "@/lib/agent-prompt-build"
import { createDefaultAgentPrompts } from "@/lib/agent-prompt-defaults"

const GENERATION_ORDER: ArtifactType[] = [
  "initiative_brief",
  "brd",
  "epic",
  "story",
  "test_case",
  "screen_layout",
]

export default function AgentSettingsPage() {
  const agentPrompts = useAppStore((s) => s.agentPrompts)
  const patchAgentPrompts = useAppStore((s) => s.patchAgentPrompts)
  const resetAgentPrompts = useAppStore((s) => s.resetAgentPrompts)

  const resetAll = () => {
    resetAgentPrompts()
    toast.success("All agent prompts restored to defaults")
  }

  const resetSage = () => {
    const d = createDefaultAgentPrompts()
    patchAgentPrompts({ sage: d.sage })
    toast.success("Sage prompts reset")
  }

  const resetScout = () => {
    const d = createDefaultAgentPrompts()
    patchAgentPrompts({ scout: d.scout })
    toast.success("Scout prompts reset")
  }

  const resetGeneration = (type: ArtifactType) => {
    const d = createDefaultAgentPrompts()
    patchAgentPrompts({ generation: { [type]: d.generation[type] } })
    toast.success(`${ARTIFACT_TYPE_LABELS[type]} prompt reset`)
  }

  const resetQuill = () => {
    const d = createDefaultAgentPrompts()
    patchAgentPrompts({ quill: d.quill })
    toast.success("Quill prompt reset")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to settings
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Agent prompts</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Edit system and task instructions for each AI agent. Values are
          saved in this browser and sent with Ideas chat, Brief generation, other
          generation steps, and refinement requests.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Placeholders
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            <strong className="text-foreground">Sage:</strong>{" "}
            {PROMPT_PLACEHOLDER_HELP.sage.system}{" "}
            <span className="text-foreground/80">
              {PROMPT_PLACEHOLDER_HELP.sage.contextWrap}
            </span>
            <br />
            <strong className="text-foreground mt-2 inline-block">
              {AGENT_SCOUT.name}:
            </strong>{" "}
            {PROMPT_PLACEHOLDER_HELP.scout.system}{" "}
            <span className="text-foreground/80">
              {PROMPT_PLACEHOLDER_HELP.scout.sessionContext}
            </span>
            <br />
            <strong className="text-foreground mt-2 inline-block">
              Generation (Morgan, Atlas, Scribe, Sentinel, Frame):
            </strong>{" "}
            {PROMPT_PLACEHOLDER_HELP.generation}
            <br />
            <strong className="text-foreground mt-2 inline-block">Quill:</strong>{" "}
            {PROMPT_PLACEHOLDER_HELP.quill}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={resetAll}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset all to defaults
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <CardTitle className="text-base">Sage</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Overview chat API
              </Badge>
            </div>
            <CardDescription className="text-xs">
              System message and initiative wrapper for Overview-style chat when
              using the streaming brainstorm API route.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs h-8"
            onClick={resetSage}
          >
            Reset Sage
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sage-system" className="text-xs font-medium">
              System prompt
            </Label>
            <Textarea
              id="sage-system"
              value={agentPrompts.sage.systemPrompt}
              onChange={(e) =>
                patchAgentPrompts({
                  sage: { systemPrompt: e.target.value },
                })
              }
              className="min-h-[200px] font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sage-wrap" className="text-xs font-medium">
              Initiative wrapper (optional block)
            </Label>
            <Textarea
              id="sage-wrap"
              value={agentPrompts.sage.contextWrapTemplate}
              onChange={(e) =>
                patchAgentPrompts({
                  sage: { contextWrapTemplate: e.target.value },
                })
              }
              className="min-h-[100px] font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <CardTitle className="text-base">{AGENT_SCOUT.name}</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Ideas tab
              </Badge>
            </div>
            <CardDescription className="text-xs">
              System prompt plus session template for Ideas streaming chat
              (<code className="text-[11px]">/api/ai/ideation-chat</code>).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs h-8"
            onClick={resetScout}
          >
            Reset Scout
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scout-system" className="text-xs font-medium">
              System prompt
            </Label>
            <Textarea
              id="scout-system"
              value={agentPrompts.scout.systemPrompt}
              onChange={(e) =>
                patchAgentPrompts({
                  scout: { systemPrompt: e.target.value },
                })
              }
              className="min-h-[200px] font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scout-session" className="text-xs font-medium">
              Session context template
            </Label>
            <Textarea
              id="scout-session"
              value={agentPrompts.scout.sessionContextTemplate}
              onChange={(e) =>
                patchAgentPrompts({
                  scout: { sessionContextTemplate: e.target.value },
                })
              }
              className="min-h-[140px] font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Generation — one user message per run
        </h2>
        {GENERATION_ORDER.map((type) => {
          const agent = getAgentForArtifactType(type)
          return (
            <Card key={type}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-base">
                      {ARTIFACT_TYPE_LABELS[type]}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {agent.name}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Template must include <code className="text-[11px]">{"{{CONTEXT}}"}</code>{" "}
                    where parent content or initiative text is inserted.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs h-8"
                  onClick={() => resetGeneration(type)}
                >
                  Reset
                </Button>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={agentPrompts.generation[type]}
                  onChange={(e) =>
                    patchAgentPrompts({
                      generation: { [type]: e.target.value },
                    })
                  }
                  className="min-h-[220px] font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <CardTitle className="text-base">Quill</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Refinement
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Full user message for artifact edits. Use{" "}
              <code className="text-[11px]">{"{{REVISION_RULES}}"}</code> for
              type-specific output rules (markdown vs layout JSON).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs h-8"
            onClick={resetQuill}
          >
            Reset Quill
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={agentPrompts.quill}
            onChange={(e) => patchAgentPrompts({ quill: e.target.value })}
            className="min-h-[260px] font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
