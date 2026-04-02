"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Lightbulb, ListChecks } from "lucide-react"
import { useAppStore } from "@/lib/store"

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  ownerName: string
  ownerRole: string
}

export function NewProjectDialog({
  open,
  onClose,
  ownerName,
  ownerRole,
}: NewProjectDialogProps) {
  const router = useRouter()
  const addProject = useAppStore((s) => s.addProject)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    cro_context: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const project = addProject({
      name: form.name.trim(),
      description: form.description.trim(),
      cro_context: form.cro_context.trim(),
      owner: ownerName,
      ownerRole,
      status: "active",
    })
    setLoading(false)
    setForm({ name: "", description: "", cro_context: "" })
    onClose()
    router.push(`/projects/${project.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[min(92vh,880px)] w-[calc(100%-1.5rem)] max-w-2xl gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="border-b border-border/80 bg-muted/30 px-6 py-5 sm:px-8 sm:py-6">
          <DialogHeader className="gap-3 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              New Digital Sales initiative
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              Each initiative gets a workbench: Ideas and Brief, then staged
              generation for BRD through layouts, review in Artifacts, and export
              to Jira / Figma (Confluence optional). Edit context anytime on Overview.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-7">
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4 sm:p-5">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Lightbulb className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Tips for a strong initiative
                </p>
                <ul className="space-y-1.5 text-[13px] text-muted-foreground leading-relaxed">
                  <li className="flex gap-2">
                    <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span>
                      Use a <strong className="font-medium text-foreground/90">clear name</strong>{" "}
                      (initiative + timeframe or channel) so teams can find it later.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span>
                      Under <strong className="font-medium text-foreground/90">Problem Statement</strong>, state
                      the outcome (e.g. “reduce cart abandonment”)—not only a feature name.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span>
                      <strong className="font-medium text-foreground/90">Additional thoughts</strong>{" "}
                      are optional—KPIs, audience, constraints—for richer briefs and artifacts.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">
                Initiative name
              </Label>
              <Input
                id="name"
                placeholder="e.g. Checkout completion uplift — Q3 2025"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="h-11 text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">
                Problem Statement
              </Label>
              <Textarea
                id="description"
                placeholder="e.g. Reduce cart abandonment on mobile checkout"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                required
                className="min-h-[88px] resize-y text-[15px] leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context" className="text-sm">
                Additional thoughts{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="context"
                placeholder="KPIs, audience, constraints—anything Scout, Sage, and your team should know…"
                value={form.cro_context}
                onChange={(e) =>
                  setForm({ ...form, cro_context: e.target.value })
                }
                rows={5}
                className="min-h-[120px] resize-y text-[15px] leading-relaxed"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-5 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="h-10 min-w-[160px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create initiative"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
