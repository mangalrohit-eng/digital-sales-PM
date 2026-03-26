"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet"

interface AppShellProps {
  children: React.ReactNode
  userName: string
  userRole: string
  userTitle: string
}

export function AppShell({
  children,
  userName,
  userRole,
  userTitle,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <Header
        userName={userName}
        userRole={userRole}
        userTitle={userTitle}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
      <main className="ml-0 min-h-screen pt-16 app-bg md:ml-[220px]">
        <div className="max-w-7xl p-4 sm:p-6 md:p-7">{children}</div>
      </main>
    </div>
  )
}
