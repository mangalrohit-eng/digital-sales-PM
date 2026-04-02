"use client"

import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export interface WorkbenchCollapsibleChatProps {
  /**
   * Session key for remembering expanded state (e.g. `ideas-${projectId}`).
   * Default is collapsed; expanded state persists for the browser session.
   */
  storageKey: string
  className?: string
  /** Optional hint on the collapsed bar (e.g. message count). */
  summary?: ReactNode
  /** Header content when expanded (titles, badges, actions). */
  header: ReactNode
  /** Messages area + composer (shown only when expanded). */
  body: ReactNode
}

/**
 * Workbench chat card: collapsed by default to give the preview column more room.
 */
export function WorkbenchCollapsibleChat({
  storageKey,
  className,
  summary,
  header,
  body,
}: WorkbenchCollapsibleChatProps) {
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        setExpanded(true)
      }
    } catch {
      /* private mode */
    }
  }, [storageKey])

  const expand = useCallback(() => {
    setExpanded(true)
    try {
      sessionStorage.setItem(storageKey, "1")
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const collapse = useCallback(() => {
    setExpanded(false)
    try {
      sessionStorage.setItem(storageKey, "0")
    } catch {
      /* ignore */
    }
  }, [storageKey])

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background",
        expanded
          ? "min-h-0 min-h-[10rem] flex-[1.15]"
          : "shrink-0 flex-none",
        className
      )}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={expand}
          aria-expanded={false}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <MessageSquare
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Chat
          </span>
          {summary ? (
            <span className="truncate text-[11px] text-muted-foreground">
              {summary}
            </span>
          ) : null}
          <span className="ml-auto text-[11px] font-medium text-primary">
            Expand
          </span>
        </button>
      ) : (
        <>
          <div className="flex shrink-0 gap-1 border-b border-border bg-muted/30 px-2 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={collapse}
              aria-expanded={true}
              aria-label="Collapse chat"
              title="Collapse chat"
            >
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            </Button>
            <div className="min-w-0 flex-1">{header}</div>
          </div>
          {body}
        </>
      )}
    </div>
  )
}
