"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  ACTIVITY_HEADLINE,
  type WorkbenchAgentActivityDetail,
  type WorkbenchAgentRecentPlanning,
} from "@/lib/workbench-agent-activity"

export type { WorkbenchAgentActivityKind } from "@/lib/workbench-agent-activity"
export type { WorkbenchAgentActivityDetail } from "@/lib/workbench-agent-activity"
export type { WorkbenchAgentRecentPlanning } from "@/lib/workbench-agent-activity"

type WorkbenchAgentBusyContextValue = {
  busyCount: number
  /** Top of stack: the request currently shown in the footer. */
  activeDetail: WorkbenchAgentActivityDetail | null
  /** Planning from the last finished request (footer stays visible after busy ends). */
  recentPlanning: WorkbenchAgentRecentPlanning | null
  begin: (detail: WorkbenchAgentActivityDetail) => void
  /** Merge into the active (top) request — e.g. attach model planning when the API returns. */
  patchActiveDetail: (partial: Partial<WorkbenchAgentActivityDetail>) => void
  end: () => void
  dismissRecentPlanning: () => void
}

const WorkbenchAgentBusyContext =
  createContext<WorkbenchAgentBusyContextValue | null>(null)

export function WorkbenchAgentBusyProvider({ children }: { children: ReactNode }) {
  const [busyCount, setBusyCount] = useState(0)
  const [activeDetail, setActiveDetail] =
    useState<WorkbenchAgentActivityDetail | null>(null)
  const [recentPlanning, setRecentPlanning] =
    useState<WorkbenchAgentRecentPlanning | null>(null)
  const stackRef = useRef<WorkbenchAgentActivityDetail[]>([])

  const begin = useCallback((detail: WorkbenchAgentActivityDetail) => {
    setRecentPlanning(null)
    stackRef.current = [...stackRef.current, detail]
    setBusyCount((n) => n + 1)
    setActiveDetail(detail)
  }, [])

  const patchActiveDetail = useCallback(
    (partial: Partial<WorkbenchAgentActivityDetail>) => {
      const stack = stackRef.current
      if (stack.length === 0) return
      const i = stack.length - 1
      const prev = stack[i]!
      const next = { ...prev, ...partial }
      stack[i] = next
      setActiveDetail(next)
    },
    []
  )

  const end = useCallback(() => {
    const stack = stackRef.current
    if (stack.length === 0) return
    const top = stack[stack.length - 1]!
    const plan = top.planning?.trim()
    setRecentPlanning({
      headline: ACTIVITY_HEADLINE[top.kind],
      planning:
        plan ||
        "No separate planning block was detected in the model reply (expected lines <<<WORKBENCH_PLANNING>>> then <<<WORKBENCH_DELIVERABLE>>>). Your brief or artifact may still have updated—check the editor above.",
      contextLines: top.contextLines,
      sources: top.sources,
    })
    stackRef.current = stack.slice(0, -1)
    setBusyCount((n) => Math.max(0, n - 1))
    const s = stackRef.current
    setActiveDetail(s.length > 0 ? s[s.length - 1]! : null)
  }, [])

  const dismissRecentPlanning = useCallback(() => {
    setRecentPlanning(null)
  }, [])

  const value = useMemo(
    () => ({
      busyCount,
      activeDetail,
      recentPlanning,
      begin,
      patchActiveDetail,
      end,
      dismissRecentPlanning,
    }),
    [
      busyCount,
      activeDetail,
      recentPlanning,
      begin,
      patchActiveDetail,
      end,
      dismissRecentPlanning,
    ]
  )
  return (
    <WorkbenchAgentBusyContext.Provider value={value}>
      {children}
    </WorkbenchAgentBusyContext.Provider>
  )
}

/** Tracks AI work on the project workbench; safe no-op when used outside the provider. */
export function useWorkbenchAgentBusy(): WorkbenchAgentBusyContextValue {
  const ctx = useContext(WorkbenchAgentBusyContext)
  if (!ctx) {
    return {
      busyCount: 0,
      activeDetail: null,
      recentPlanning: null,
      begin: () => {},
      patchActiveDetail: () => {},
      end: () => {},
      dismissRecentPlanning: () => {},
    }
  }
  return ctx
}
