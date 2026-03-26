"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Zap,
  ChevronRight,
} from "lucide-react"

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-60 flex flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--sidebar-border)] shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--sidebar-accent-foreground)] leading-tight truncate">
            Digital Sales AI
          </p>
          <p className="text-[10px] text-[var(--sidebar-foreground)]/50 truncate">
            Charter Communications
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-[var(--sidebar-foreground)]/40 uppercase tracking-widest px-3 mb-2">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-white" : "text-[var(--sidebar-foreground)]/50 group-hover:text-[var(--sidebar-accent-foreground)]"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3 h-3 text-white/60" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom branding */}
      <div className="px-5 py-4 border-t border-[var(--sidebar-border)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-[var(--sidebar-foreground)]/40">
            AI services online
          </span>
        </div>
      </div>
    </aside>
  )
}
