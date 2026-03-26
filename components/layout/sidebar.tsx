"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Activity,
} from "lucide-react"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as { name?: string; role?: string; title?: string } | undefined

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U"

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] flex flex-col z-30"
      style={{ background: "linear-gradient(180deg, oklch(0.165 0.038 253) 0%, oklch(0.145 0.030 253) 100%)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0" style={{ borderBottom: "1px solid oklch(0.26 0.04 253)" }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-primary shrink-0 shadow-md shadow-primary/40">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/90 leading-tight truncate tracking-tight">
            Digital Sales AI
          </p>
          <p className="text-[10px] text-white/35 truncate mt-0.5">
            Charter Communications
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
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
                "relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "text-white"
                  : "text-white/45 hover:text-white/80 hover:bg-white/5"
              )}
            >
              {/* Active left border */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              {/* Active background */}
              {isActive && (
                <span className="absolute inset-0 rounded-lg bg-white/8" />
              )}
              <Icon
                className={cn(
                  "w-[17px] h-[17px] shrink-0 relative z-10",
                  isActive ? "text-primary" : "text-white/35"
                )}
                strokeWidth={isActive ? 2 : 1.8}
              />
              <span className="relative z-10 flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3 shrink-0" style={{ borderTop: "1px solid oklch(0.26 0.04 253)" }}>
        {/* AI status */}
        <div className="flex items-center gap-2.5 pt-3.5 px-1">
          <Activity className="w-3.5 h-3.5 text-emerald-400/70" />
          <span className="text-[11px] text-white/30 flex-1">AI services</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_oklch(0.65_0.18_155)]" />
            <span className="text-[10px] text-emerald-400/70 font-medium">Online</span>
          </div>
        </div>

        {/* User card */}
        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
              <span className="text-[11px] font-bold text-primary">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-white/70 truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-white/30 truncate leading-tight capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
