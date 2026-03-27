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
import type { WorkbenchAgentActivityDetail } from "@/lib/workbench-agent-activity"

export type { WorkbenchAgentActivityKind } from "@/lib/workbench-agent-activity"
export type { WorkbenchAgentActivityDetail } from "@/lib/workbench-agent-activity"
export type { WorkbenchAgentRecentPlanning } from "@/lib/workbench-agent-activity"

type WorkbenchAgentBusyContextValue = {
  busyCount: number
  /** Top of stack: the request currently shown in the footer. */
  activeDetail: WorkbenchAgentActivityDetail | null
  begin: (detail: WorkbenchAgentActivityDetail) => void
  /** Merge into the active (top) request — e.g. attach model planning when the API returns. */
  patchActiveDetail: (partial: Partial<WorkbenchAgentActivityDetail>) => void
  end: () => void
}

const WorkbenchAgentBusyContext =
  createContext<WorkbenchAgentBusyContextValue | null>(null)

export function WorkbenchAgentBusyProvider({ children }: { children: ReactNode }) {
  const [busyCount, setBusyCount] = useState(0)
  const [activeDetail, setActiveDetail] =
    useState<WorkbenchAgentActivityDetail | null>(null)
  const stackRef = useRef<WorkbenchAgentActivityDetail[]>([])

  const begin = useCallback((detail: WorkbenchAgentActivityDetail) => {
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
    stackRef.current = stack.slice(0, -1)
    setBusyCount((n) => Math.max(0, n - 1))
    const s = stackRef.current
    setActiveDetail(s.length > 0 ? s[s.length - 1]! : null)
  }, [])

  const value = useMemo(
    () => ({
      busyCount,
      activeDetail,
      begin,
      patchActiveDetail,
      end,
    }),
    [busyCount, activeDetail, begin, patchActiveDetail, end]
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
      begin: () => {},
      patchActiveDetail: () => {},
      end: () => {},
    }
  }
  return ctx
}
