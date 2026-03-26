import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface AppNavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Settings", href: "/settings", icon: Settings },
]
