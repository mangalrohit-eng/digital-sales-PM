"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { APP_NAV_ITEMS } from "@/lib/nav-items"
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
            Digital Sales AI
          </SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Charter Communications
          </p>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {APP_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)
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
          <div className="mt-auto border-t border-border p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
