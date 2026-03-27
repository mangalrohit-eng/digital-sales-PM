"use client"

import Link from "next/link"
import { InitiativesPanel } from "@/components/dashboard/initiatives-panel"

export default function ProjectsPage() {
  return (
    <div>
      <nav
        className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link
          href="/dashboard"
          className="font-medium hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <span aria-hidden className="text-border select-none">
          /
        </span>
        <span className="text-foreground font-medium">Initiatives</span>
      </nav>
      <InitiativesPanel variant="page" />
    </div>
  )
}
