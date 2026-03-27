import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

export interface AppNavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Initiatives", href: "/projects", icon: FolderKanban },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Agent prompts", href: "/settings/agents", icon: Sparkles },
]

/** True when this primary nav item should show as active (includes project workbench under Projects). */
export function isAppNavItemActive(pathname: string, itemHref: string): boolean {
  if (itemHref === "/dashboard") return pathname === "/dashboard"
  if (itemHref === "/projects") {
    return pathname === "/projects" || /^\/projects\/[^/]+$/.test(pathname)
  }
  if (itemHref === "/settings/agents") return pathname.startsWith("/settings/agents")
  if (itemHref === "/settings") return pathname === "/settings"
  return pathname.startsWith(itemHref)
}
