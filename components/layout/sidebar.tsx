"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { APP_NAV_ITEMS, isAppNavItemActive } from "@/lib/nav-items"
import { Activity, AlertCircle } from "lucide-react"

interface KeyStatus {
  configured: boolean
  source: "env" | "session" | "none"
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as
    | { name?: string; role?: string; title?: string }
    | undefined
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)

  useEffect(() => {
    fetch("/api/settings/key")
      .then((r) => r.json())
      .then(setKeyStatus)
      .catch(() => setKeyStatus({ configured: false, source: "none" }))
  }, [])

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U"

  const aiReady = keyStatus?.configured === true
  const aiLoading = keyStatus === null

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col md:flex"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.165 0.038 253) 0%, oklch(0.145 0.030 253) 100%)",
      }}
    >
      {/* Logo */}
      <div
        className="flex h-16 shrink-0 items-center gap-3 px-5"
        style={{ borderBottom: "1px solid oklch(0.26 0.04 253)" }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary shadow-md shadow-primary/40">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-white/90">
            {APP_NAME}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-white/35">
            {APP_TAGLINE}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Primary">
        {APP_NAV_ITEMS.map((item) => {
          const isActive = isAppNavItemActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "text-white"
                  : "text-white/45 hover:bg-white/5 hover:text-white/80"
              )}
            >
              {isActive && (
                <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              {isActive && (
                <span className="absolute inset-0 rounded-lg bg-white/8" />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-[17px] w-[17px] shrink-0",
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
      <div
        className="shrink-0 space-y-3 px-3 pb-4"
        style={{ borderTop: "1px solid oklch(0.26 0.04 253)" }}
      >
        <div className="flex items-center gap-2.5 px-1 pt-3.5">
          {aiLoading ? (
            <>
              <Activity className="h-3.5 w-3.5 animate-pulse text-white/30" />
              <span className="flex-1 text-[11px] text-white/30">
                Checking AI…
              </span>
            </>
          ) : aiReady ? (
            <>
              <Activity className="h-3.5 w-3.5 text-emerald-400/70" />
              <span className="flex-1 text-[11px] text-white/30">
                AI key
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_oklch(0.65_0.18_155)]" />
                <span className="text-[10px] font-medium text-emerald-400/80">
                  Ready
                </span>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
              <Link
                href="/settings"
                className="min-w-0 flex-1 text-left text-[11px] text-amber-200/80 underline-offset-2 hover:underline"
              >
                Add OpenAI key in Settings
              </Link>
            </>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/20">
              <span className="text-[11px] font-bold text-primary">
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium leading-tight text-white/70">
                {user.name}
              </p>
              <p className="truncate text-[10px] capitalize leading-tight text-white/30">
                {user.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
