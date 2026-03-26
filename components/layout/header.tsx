"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, ChevronRight } from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  userName: string
  userRole: string
  userTitle: string
}

export function Header({ userName, userRole, userTitle }: HeaderProps) {
  const router = useRouter()
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <header className="fixed top-0 left-[220px] right-0 h-16 bg-background/90 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-6 z-20"
      style={{ boxShadow: "0 1px 0 oklch(0 0 0 / 0.04), 0 2px 8px oklch(0 0 0 / 0.04)" }}
    >
      {/* Charter wordmark */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-foreground/50 tracking-tight">Charter</span>
        <ChevronRight className="w-3.5 h-3.5 text-border" />
        <span className="text-[13px] font-semibold text-foreground/80 tracking-tight">Spectrum Digital Sales</span>
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
