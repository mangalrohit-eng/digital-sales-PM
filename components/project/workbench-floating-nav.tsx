"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { ChevronLeft, LayoutDashboard } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WorkbenchOverflowMenu } from "@/components/layout/workbench-overflow-menu"

export interface WorkbenchStageTab {
  value: string
  label: string
  icon: ElementType<{ className?: string; strokeWidth?: number }>
  badge: string | null
  step: number | null
}

interface WorkbenchFloatingNavProps {
  projectName: string
  tabs: WorkbenchStageTab[]
}

export function WorkbenchFloatingNav({ projectName, tabs }: WorkbenchFloatingNavProps) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 pointer-events-none pt-[max(0.5rem,env(safe-area-inset-top))] px-2 pb-1 sm:px-3"
      aria-label="Workbench navigation"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-6xl rounded-2xl border border-border/70 bg-background/92 shadow-[0_10px_40px_-12px_oklch(0_0_0/0.28)] backdrop-blur-md">
        {/* Initiative bar — same width as steps row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link
              href="/projects"
              aria-label="Back to all initiatives"
              className="inline-flex shrink-0 items-center gap-0.5 rounded-lg py-1 pl-1 pr-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/90 hover:text-foreground sm:gap-1 sm:text-[12px]"
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} />
              <span className="max-[380px]:hidden">Initiatives</span>
            </Link>
            <span
              className="min-w-0 truncate text-left text-[12px] font-semibold leading-tight text-foreground sm:text-[13px]"
              title={projectName}
            >
              {projectName}
            </span>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 border-border/80 bg-background/95 px-2.5 text-[11px] shadow-sm backdrop-blur-sm sm:h-8 sm:text-xs"
              )}
            >
              <LayoutDashboard className="size-3.5 opacity-90" strokeWidth={2} />
              <span className="hidden min-[400px]:inline">Dashboard</span>
            </Link>
            <WorkbenchOverflowMenu />
          </div>
        </div>

        {/* Steps — full width strip (scrolls when needed) */}
        <div className="w-full overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] px-1.5 py-1.5 sm:px-2 sm:py-2 [&::-webkit-scrollbar]:hidden">
          <TabsList
            aria-label="Workspace steps — scroll sideways on small screens"
            className="flex h-auto min-h-0 w-max min-w-full flex-nowrap gap-1 bg-transparent p-0 shadow-none sm:gap-1.5 [&_[data-slot=tabs-trigger]]:min-w-[3rem] sm:[&_[data-slot=tabs-trigger]]:min-w-[3.25rem] md:[&_[data-slot=tabs-trigger]]:min-w-0 md:[&_[data-slot=tabs-trigger]]:flex-1"
          >
            {tabs.map(({ value, label, icon: Icon, badge, step }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="group box-border flex min-h-[2.65rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-transparent bg-muted/35 px-1 py-1 text-center text-[10px] font-semibold shadow-sm transition-all duration-200 sm:min-h-[2.75rem] sm:flex-row sm:gap-1 sm:px-1.5 sm:text-[11px] data-active:border-primary/45 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md data-active:shadow-primary/25 data-active:[&_.workflow-step-num]:bg-white/25 data-active:[&_.workflow-step-num]:text-primary-foreground data-active:[&_svg]:opacity-100 data-active:[&_.workflow-tab-badge]:bg-white/20 data-active:[&_.workflow-tab-badge]:text-primary-foreground text-foreground/85 hover:bg-muted/80 hover:text-foreground lg:text-[12px]"
              >
                <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:contents">
                  {step != null && (
                    <span className="workflow-step-num flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold text-primary sm:h-5 sm:w-5 sm:text-[9px]">
                      {step}
                    </span>
                  )}
                  <Icon
                    className="h-3 w-3 shrink-0 opacity-80 sm:h-3.5 sm:w-3.5"
                    strokeWidth={2}
                  />
                  <span className="line-clamp-2 min-w-0 max-w-full text-center leading-tight sm:line-clamp-1">
                    {label}
                  </span>
                </div>
                {badge && (
                  <span
                    className={`workflow-tab-badge mt-0.5 inline-flex min-h-[14px] min-w-[14px] shrink-0 items-center justify-center rounded-full px-0.5 text-[7px] font-bold sm:ml-0.5 sm:mt-0 sm:min-h-[16px] sm:min-w-[16px] sm:px-1 sm:text-[9px] ${
                      value === "export"
                        ? "bg-emerald-100 text-emerald-800 data-active:bg-white/20 data-active:text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
    </div>
  )
}
