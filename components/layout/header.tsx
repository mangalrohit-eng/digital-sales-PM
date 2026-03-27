"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, Settings, ChevronRight, Menu } from "lucide-react"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"

interface HeaderProps {
  userName: string
  userRole: string
  userTitle: string
  onOpenMobileNav?: () => void
}

export function Header({
  userName,
  userRole,
  userTitle,
  onOpenMobileNav,
}: HeaderProps) {
  const router = useRouter()
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <header
      className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md sm:gap-3 sm:px-6"
      style={{
        boxShadow:
          "0 1px 0 oklch(0 0 0 / 0.04), 0 2px 8px oklch(0 0 0 / 0.04)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground hover:bg-muted md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src="/acn-mark.svg"
            alt=""
            width={28}
            height={30}
            className="h-6 w-auto shrink-0 object-contain sm:h-7"
            aria-hidden
          />
          <span className="truncate text-xs font-semibold text-foreground/90 tracking-tight sm:text-[13px]">
            {APP_NAME}
          </span>
          <ChevronRight className="hidden shrink-0 text-border sm:block h-3.5 w-3.5" />
          <span className="hidden truncate text-[13px] font-medium text-foreground/55 tracking-tight md:inline max-w-[min(100%,12rem)] lg:max-w-[14rem]">
            {APP_TAGLINE}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex min-w-0 max-w-[38vw] flex-col items-end gap-0.5 sm:max-w-[200px]">
            <p className="w-full truncate text-right text-xs font-semibold leading-tight text-foreground sm:text-[13px]">
              {userName}
            </p>
            <p className="hidden w-full truncate text-right text-[11px] leading-tight text-muted-foreground sm:block">
              {userTitle}
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <LogOut className="h-3 w-3 opacity-70" strokeWidth={2} />
              Log out
            </button>
          </div>
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8 ring-2 ring-border sm:h-9 sm:w-9">
              <AvatarFallback className="bg-primary text-xs font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div
              className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background text-[7px] font-bold text-white ${
                userRole === "admin" ? "bg-violet-500" : "bg-sky-500"
              }`}
            >
              {userRole === "admin" ? "A" : "P"}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
