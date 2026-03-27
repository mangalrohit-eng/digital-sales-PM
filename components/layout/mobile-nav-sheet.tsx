"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { APP_NAV_ITEMS, isAppNavItemActive } from "@/lib/nav-items"
import { LogOut, Settings } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface MobileNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as
    | { name?: string; role?: string }
    | undefined

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex h-full w-[min(100%,280px)] flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="text-base font-semibold">
            {APP_NAME}
          </SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            {APP_TAGLINE}
          </p>
        </SheetHeader>
        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
          aria-label="Primary"
        >
          {APP_NAV_ITEMS.map((item) => {
            const isActive = isAppNavItemActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={isActive ? 2 : 1.8} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        {user && (
          <div className="mt-auto space-y-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              onClick={() => onOpenChange(false)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                signOut({ callbackUrl: "/login" })
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
              Log out
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
