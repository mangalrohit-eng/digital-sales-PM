"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
      className="fixed top-0 right-0 left-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md md:left-[220px] md:px-6"
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground hover:bg-muted md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/acn-mark.svg"
            alt=""
            width={28}
            height={30}
            className="h-7 w-auto shrink-0 object-contain"
            aria-hidden
          />
          <span className="text-[13px] font-semibold text-foreground/90 tracking-tight">
            {APP_NAME}
          </span>
          <ChevronRight className="hidden shrink-0 text-border sm:block w-3.5 h-3.5" />
          <span className="hidden truncate text-[13px] font-medium text-foreground/55 tracking-tight sm:inline max-w-[min(100%,14rem)]">
            {APP_TAGLINE}
          </span>
        </div>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-3 hover:bg-accent/60 rounded-xl px-3 py-2 transition-all duration-150 outline-none group" />
          }
        >
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-semibold leading-tight text-foreground">{userName}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{userTitle}</p>
          </div>
          <div className="relative">
            <Avatar className="w-8 h-8 ring-2 ring-border group-hover:ring-primary/30 transition-all">
              <AvatarFallback className="bg-primary text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center text-[7px] font-bold text-white ${userRole === "admin" ? "bg-violet-500" : "bg-sky-500"}`}>
              {userRole === "admin" ? "A" : "P"}
            </div>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 mt-1">
          <DropdownMenuLabel className="pb-2">
            <div className="flex items-center gap-2.5">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-white text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-[13px]">{userName}</p>
                <p className="text-[11px] text-muted-foreground font-normal">{userTitle}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-[13px] gap-2.5"
            onClick={() => router.push("/settings")}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive cursor-pointer text-[13px] gap-2.5"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
