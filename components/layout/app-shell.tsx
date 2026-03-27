"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { SecondaryTopNav } from "@/components/layout/secondary-top-nav"
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet"
import { Sidebar } from "@/components/layout/sidebar"

function isProjectWorkbenchPath(pathname: string | null): boolean {
  if (!pathname) return false
  return /^\/projects\/[^/]+$/.test(pathname)
}

function isWelcomePath(pathname: string | null): boolean {
  return pathname === "/welcome"
}

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
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const workbench = isProjectWorkbenchPath(pathname)
  const welcome = isWelcomePath(pathname)
  const hideChrome = workbench || welcome

  return (
    <div className="min-h-screen bg-background">
      {!hideChrome && (
        <>
          <Sidebar />
          <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
          <SecondaryTopNav
            userName={userName}
            userRole={userRole}
            userTitle={userTitle}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
        </>
      )}
      <div
        className={`flex min-h-screen flex-col ${hideChrome ? "min-h-0" : "md:pl-[220px]"}`}
      >
        <main
          className={`app-bg min-w-0 overflow-x-hidden ${
            workbench
              ? "flex h-dvh max-h-dvh min-h-0 flex-1 flex-col overflow-hidden"
              : welcome
                ? "flex min-h-dvh flex-1 flex-col overflow-y-auto"
                : "min-h-0 flex-1"
          }`}
        >
          {workbench ? (
            <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6">
              {children}
            </div>
          ) : welcome ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 md:max-w-4xl md:py-12">
              {children}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 md:px-7 md:py-7">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
