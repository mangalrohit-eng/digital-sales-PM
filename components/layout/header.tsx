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
import { LogOut, Settings, User } from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  userName: string
  userRole: string
  userTitle: string
  breadcrumb?: { label: string; href?: string }[]
}

export function Header({ userName, userRole, userTitle, breadcrumb }: HeaderProps) {
  const router = useRouter()
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <header className="fixed top-0 left-60 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 z-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumb && breadcrumb.length > 0 ? (
          breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">
            Charter Digital Sales
          </span>
        )}
      </nav>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-3 hover:bg-accent rounded-lg px-3 py-1.5 transition-colors outline-none" />
          }
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-tight">{userName}</p>
            <p className="text-xs text-muted-foreground leading-tight">
              {userTitle}
            </p>
          </div>
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Badge
              className={`absolute -bottom-1 -right-1 text-[9px] px-1 py-0 h-auto leading-tight border-background border ${
                userRole === "admin"
                  ? "bg-violet-500 text-white"
                  : "bg-sky-500 text-white"
              }`}
            >
              {userRole === "admin" ? "Admin" : "Analyst"}
            </Badge>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {userTitle}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push("/settings")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <User className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
