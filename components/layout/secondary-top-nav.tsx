"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { APP_NAV_ITEMS, isAppNavItemActive } from "@/lib/nav-items"
import { Activity, AlertCircle, LogOut, Menu } from "lucide-react"

interface KeyStatus {
  configured: boolean
  source: "env" | "session" | "none"
}

interface SecondaryTopNavProps {
  userName: string
  userRole: string
  userTitle: string
  onOpenMobileNav: () => void
}

export function SecondaryTopNav({
  userName,
  userRole,
  userTitle,
  onOpenMobileNav,
}: SecondaryTopNavProps) {
  const pathname = usePathname()
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)

  useEffect(() => {
    fetch("/api/settings/key")
      .then((r) => r.json())
      .then(setKeyStatus)
      .catch(() => setKeyStatus({ configured: false, source: "none" }))
  }, [])

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const aiReady = keyStatus?.configured === true
  const aiLoading = keyStatus === null

  return (
    <header
      className="sticky top-0 z-50 flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-border/60 bg-background/95 px-3 backdrop-blur-md sm:h-14 sm:gap-4 sm:px-5"
      style={{
        boxShadow:
          "0 1px 0 oklch(0 0 0 / 0.04), 0 2px 8px oklch(0 0 0 / 0.04)",
      }}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground hover:bg-muted md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      <Link
        href="/dashboard"
        className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5"
      >
        <img
          src="/acn-mark.svg"
          alt=""
          width={28}
          height={30}
          className="h-6 w-auto shrink-0 object-contain sm:h-7"
          aria-hidden
        />
        <div className="min-w-0 hidden sm:block">
          <p className="truncate text-xs font-semibold text-foreground sm:text-[13px]">
            {APP_NAME}
          </p>
          <p className="truncate text-[10px] text-muted-foreground hidden sm:block">
            {APP_TAGLINE}
          </p>
        </div>
      </Link>

      <nav className="hidden lg:flex items-center gap-1 ml-2" aria-label="Primary">
        {APP_NAV_ITEMS.map((item) => {
          const isActive = isAppNavItemActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-1 min-w-0 justify-end items-center gap-2 sm:gap-3">
        {aiLoading ? (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1">
            <Activity className="h-3 w-3 animate-pulse text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              Checking AI…
            </span>
          </div>
        ) : (
          <Link
            href="/settings"
            title={
              aiReady
                ? "Open Settings to review or change your API key"
                : "Open Settings to add your OpenAI API key"
            }
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 transition-colors hover:bg-muted/70 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {aiReady ? (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  AI ready
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-medium text-amber-700/90">
                  Add API key
                </span>
              </>
            )}
          </Link>
        )}

        <div className="hidden sm:flex min-w-0 max-w-[140px] flex-col items-end">
          <p className="w-full truncate text-right text-xs font-semibold text-foreground">
            {userName}
          </p>
          <p className="w-full truncate text-right text-[10px] text-muted-foreground">
            {userTitle}
          </p>
        </div>

        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-border sm:h-9 sm:w-9">
          <AvatarFallback className="bg-primary text-[10px] font-bold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="hidden sm:inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
          Log out
        </button>
      </div>
    </header>
  )
}
