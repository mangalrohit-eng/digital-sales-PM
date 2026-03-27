"use client"

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Sparkles,
  MoreHorizontal,
  LogOut,
} from "lucide-react"

export function WorkbenchOverflowMenu() {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-9 w-9 shrink-0 border-border/80 bg-background"
        )}
        aria-label="App menu: dashboard, initiatives, settings, sign out"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
          <LayoutDashboard className="size-4 opacity-70" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/projects")}>
          <FolderKanban className="size-4 opacity-70" />
          All initiatives
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="size-4 opacity-70" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings/agents")}>
          <Sparkles className="size-4 opacity-70" />
          Agent prompts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4 opacity-70" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
