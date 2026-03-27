"use client"

import Link from "next/link"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  ShieldAlert,
  Target,
} from "lucide-react"

const purpose = [
  "Experience the intended rhythm of work: initiative framing through structured artifacts and handoff-style export.",
  "Align stakeholders on a shared vision for a digital sales program workspace—not on every backend integration being live today.",
  "Ground the conversation in Spectrum.com digital sales context: ideation, requirements, and delivery-ready outputs.",
]

const whatWorks = [
  "Program dashboard, initiatives list, and per-initiative workbench (discovery through export).",
  "Guided flows for brainstorming, requirements, artifacts, and packaging outputs.",
  "AI-assisted drafting and refinement when an API key is configured in Settings (optional).",
  "Simulated “push to Jira” for demo storytelling—tickets are generated locally, not in a live Jira project.",
  "Configurable agent prompts under Settings for workshop-style customization.",
]

const constraints = [
  "Built as a vision prototype: data is local to this session unless you extend persistence.",
  "Not connected to production Charter systems, code repositories, Figma, Confluence, or enterprise search.",
  "Demo credentials only; not a security or access-control model for production.",
  "AI features depend on your own API configuration and provider limits.",
]

const planned = [
  "Deep links and sync with Jira, ADO, or similar delivery tools.",
  "Figma (or design-system) integration for specs and handoff.",
  "Confluence / wiki and knowledge-base grounding for requirements and reuse.",
  "Repository and documentation awareness (code, APIs, runbooks) in the workbench.",
  "Enterprise auth, tenancy, audit trails, and operational hardening.",
]

const listClass =
  "list-disc space-y-2.5 pl-5 text-[13px] leading-relaxed text-muted-foreground marker:text-muted-foreground/70"

export default function WelcomePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 pb-8">
      <header
        className="relative overflow-hidden rounded-2xl border border-foreground/10 p-6 sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.165 0.040 254) 0%, oklch(0.22 0.07 256) 60%, oklch(0.28 0.10 260) 100%)",
          boxShadow: "0 4px 24px oklch(0.50 0.19 254 / 0.18)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.65 0.2 308) 0%, transparent 45%), radial-gradient(circle at 80% 60%, oklch(0.55 0.15 260) 0%, transparent 40%)",
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
            Vision prototype
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Welcome to {APP_NAME}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-[15px]">
            {APP_TAGLINE}. This build is for stakeholder walkthroughs—integrations
            illustrate the journey, not live production systems yet.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "h-10 min-h-10 border-0 bg-white px-5 text-foreground shadow-md hover:bg-white/95"
              )}
            >
              Enter the workspace
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Link>
            <p className="text-xs text-white/50 sm:pl-1">
              You can reopen this overview anytime from{" "}
              <span className="text-white/70">Demo overview</span> in the sidebar.
            </p>
          </div>
        </div>
      </header>

      <Card className="border-foreground/10 shadow-sm">
        <CardHeader className="border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="size-4" strokeWidth={2} />
            </span>
            <div>
              <CardTitle className="text-base">Purpose</CardTitle>
              <CardDescription className="text-[13px]">
                Why this demo exists and how to use it.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className={listClass}>
            {purpose.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-foreground/10 shadow-sm">
        <CardHeader className="border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-4" strokeWidth={2} />
            </span>
            <div>
              <CardTitle className="text-base">Not live yet (planned direction)</CardTitle>
              <CardDescription className="text-[13px]">
                Natural extensions for a production-grade program workspace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className={listClass}>
            {planned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
        <Card className="border-foreground/10 shadow-sm">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" strokeWidth={2} />
              </span>
              <div>
                <CardTitle className="text-base">What works</CardTitle>
                <CardDescription className="text-[13px]">
                  Flows and capabilities you can exercise in this build.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className={listClass}>
              {whatWorks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-foreground/10 shadow-sm">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="size-4" strokeWidth={2} />
              </span>
              <div>
                <CardTitle className="text-base">Constraints</CardTitle>
                <CardDescription className="text-[13px]">
                  What to assume while exploring.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className={listClass}>
              {constraints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-2">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "h-10 min-h-10 gap-2 px-6 font-semibold"
          )}
        >
          Continue to dashboard
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Link>
      </div>
    </div>
  )
}
