"use client"

import type { FigmaHandoffChild, FigmaHandoffFrame } from "@/lib/figma-handoff"
import { parseFigmaHandoff } from "@/lib/figma-handoff"
import { LayoutTemplate } from "lucide-react"

const MAX_PREVIEW_WIDTH = 440
const MAX_PREVIEW_HEIGHT = 520

function LayoutNode({
  node,
  scale,
  depth,
}: {
  node: FigmaHandoffChild
  scale: number
  depth: number
}) {
  const t = (node.type ?? "FRAME").toUpperCase()

  if (t === "TEXT") {
    const size = Math.max(9, Math.round((node.fontSize ?? 14) * scale))
    const label = (node.characters ?? node.name ?? "Label").trim() || "Text"
    return (
      <div
        className="min-w-0 rounded-sm px-1 py-0.5 text-foreground/90 leading-snug"
        style={{
          fontSize: size,
          fontWeight: node.fontWeight ?? 400,
        }}
        title={label}
      >
        {label.length > 200 ? `${label.slice(0, 200)}…` : label}
      </div>
    )
  }

  const isHorizontal =
    (node.layoutMode ?? "VERTICAL").toUpperCase() === "HORIZONTAL"
  const gap = Math.max(2, Math.round((node.itemSpacing ?? 8) * scale))
  const pad = Math.max(0, Math.round((node.padding ?? 0) * scale))
  const kids = node.children ?? []
  const looksLikeCta =
    isHorizontal &&
    (node.name ?? "").toLowerCase().includes("cta") &&
    kids.length > 0

  return (
    <div
      className={`min-h-[20px] min-w-0 rounded-md border border-foreground/10 bg-white/80 ${
        depth === 0 ? "shadow-sm" : "bg-muted/40"
      } ${looksLikeCta ? "!border-primary/30 !bg-primary !text-primary-foreground justify-center" : ""}`}
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        alignItems: isHorizontal ? "center" : "stretch",
        gap,
        padding: pad,
        width: node.width != null ? Math.min(node.width * scale, MAX_PREVIEW_WIDTH - 24) : undefined,
        maxWidth: "100%",
        minHeight: node.height != null ? Math.min(node.height * scale, 320) : undefined,
      }}
    >
      {kids.length === 0 && (
        <div className="flex flex-1 items-center justify-center py-6 px-3 text-center">
          <span className="text-[11px] text-muted-foreground">
            {node.name ? (
              <>
                <span className="font-medium text-foreground/70">{node.name}</span>
                <br />
                <span className="text-muted-foreground/80">Region</span>
              </>
            ) : (
              "Empty frame"
            )}
          </span>
        </div>
      )}
      {kids.map((child, i) => (
        <LayoutNode key={i} node={child} scale={scale} depth={depth + 1} />
      ))}
    </div>
  )
}

function DeviceChrome({
  title,
  width,
  height,
  scale,
  children,
}: {
  title: string
  width: number
  height: number
  scale: number
  children: React.ReactNode
}) {
  const w = Math.round(width * scale)
  const h = Math.min(Math.round(height * scale), MAX_PREVIEW_HEIGHT)

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[1.35rem] border border-foreground/15 bg-zinc-900/5 shadow-xl ring-1 ring-black/[0.04]"
      style={{ width: w + 2 }}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/80 bg-muted/50 px-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400/80" />
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
        </div>
        <span className="truncate text-[10px] font-semibold text-muted-foreground">
          {title}
        </span>
      </div>
      <div
        className="overflow-auto bg-gradient-to-b from-background to-muted/30 p-3"
        style={{ maxHeight: MAX_PREVIEW_HEIGHT, minHeight: Math.min(h, 160) }}
      >
        {children}
      </div>
    </div>
  )
}

function frameAsChild(frame: FigmaHandoffFrame): FigmaHandoffChild {
  return {
    type: "FRAME",
    name: frame.name,
    width: frame.width,
    height: frame.height,
    layoutMode: frame.layoutMode,
    padding: frame.padding,
    itemSpacing: frame.itemSpacing,
    children: frame.children,
  }
}

export function FigmaHandoffPreview({ content }: { content: string }) {
  const { handoff } = parseFigmaHandoff(content)
  const frames = handoff?.document?.frames ?? []
  if (!handoff || frames.length === 0) return null

  const docTitle = handoff.document?.name ?? "Screens"

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutTemplate className="h-4 w-4" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Screen preview
          </p>
          <p className="text-sm font-medium text-foreground">{docTitle}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Rendered from the Figma handoff JSON below the written spec—layout, spacing,
        and copy approximate the structured frames.
      </p>
      <div className="flex flex-wrap gap-6">
        {frames.map((frame, idx) => {
          const fw = frame.width ?? 390
          const fh = frame.height ?? 844
          const scale = Math.min(1, MAX_PREVIEW_WIDTH / fw, MAX_PREVIEW_HEIGHT / fh)
          const title = frame.name?.trim() || `Screen ${idx + 1}`

          return (
            <div key={idx} className="flex flex-col gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                {fw}×{fh}px
              </span>
              <DeviceChrome title={title} width={fw} height={fh} scale={scale}>
                <LayoutNode node={frameAsChild(frame)} scale={scale} depth={0} />
              </DeviceChrome>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function screenLayoutMarkdownForPreview(content: string): string {
  return parseFigmaHandoff(content).markdown
}
