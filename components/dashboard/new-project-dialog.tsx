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
import { Loader2 } from "lucide-react"
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New CRO Initiative</DialogTitle>
          <DialogDescription>
            Describe your Spectrum.com optimization initiative. The AI will use
            this context throughout the workflow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Initiative name</Label>
            <Input
              id="name"
              placeholder="e.g. Checkout Flow Redesign — Q3 2025"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the initiative and its goals..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="context">
              CRO context{" "}
              <span className="text-muted-foreground font-normal">
                (optional — AI will use this for generation)
              </span>
            </Label>
            <Textarea
              id="context"
              placeholder="e.g. We're seeing 65% cart abandonment at the address verification step on mobile. Our hypothesis is that the address checker UX causes confusion..."
              value={form.cro_context}
              onChange={(e) =>
                setForm({ ...form, cro_context: e.target.value })
              }
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create initiative"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
