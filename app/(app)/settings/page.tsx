"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Trash2,
  ExternalLink,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

interface KeyStatus {
  configured: boolean
  source: "env" | "session" | "none"
}

export default function SettingsPage() {
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    fetch("/api/settings/key")
      .then((r) => r.json())
      .then(setKeyStatus)
      .catch(() => setKeyStatus({ configured: false, source: "none" }))
  }, [])

  const saveKey = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/settings/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey }),
      })
      if (!res.ok) throw new Error()
      setKeyStatus({ configured: true, source: "session" })
      setApiKey("")
      toast.success("API key saved securely")
    } catch {
      toast.error("Failed to save API key")
    } finally {
      setSaving(false)
    }
  }

  const removeKey = async () => {
    setRemoving(true)
    try {
      await fetch("/api/settings/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "" }),
      })
      setKeyStatus({ configured: false, source: "none" })
      toast.success("API key removed")
    } catch {
      toast.error("Failed to remove API key")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your workspace settings and integrations
        </p>
      </div>

      <Link href="/settings/agents" className="block group">
        <Card className="transition-colors hover:border-primary/40 hover:bg-primary/[0.02]">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                Agent prompts
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                System and task templates for Sage, generation agents, and Quill
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>
      </Link>

      {/* OpenAI Key */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">OpenAI API Key</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Required for AI-assisted discovery, generation, and editing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50">
            {keyStatus === null ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : keyStatus.configured ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">API key configured</p>
                  <p className="text-xs text-muted-foreground">
                    {keyStatus.source === "env"
                      ? "Loaded from environment variable (OPENAI_API_KEY)"
                      : "Stored in session cookie"}
                  </p>
                </div>
                {keyStatus.source === "env" ? (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    ENV
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5"
                    onClick={removeKey}
                    disabled={removing}
                  >
                    {removing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Remove
                  </Button>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">No API key configured</p>
                  <p className="text-xs text-muted-foreground">
                    AI features won&apos;t work until a key is added
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Input */}
          {keyStatus?.source !== "env" && (
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-sm">
                {keyStatus?.configured ? "Replace API key" : "Add API key"}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={saveKey}
                  disabled={!apiKey.trim() || saving}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keys are stored in a secure httpOnly cookie and never exposed to
                JavaScript.{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Get a key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local workspace */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Workspace data</CardTitle>
          <CardDescription className="text-xs">
            Initiatives and artifacts are stored in this browser only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Data stays in this browser and does not sync across devices or
            accounts. A production deployment would persist initiatives and
            artifacts in a shared backend.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Organization profiles</CardTitle>
          <CardDescription className="text-xs">
            Example roles supported in this build (credentials from your admin)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                login: "admin",
                role: "Admin",
                title: "Director, Digital Sales",
                capabilities: [
                  "Approve artifacts",
                  "Export to Jira",
                  "Full access",
                ],
              },
              {
                login: "analyst",
                role: "Analyst",
                title: "Digital Sales Analyst",
                capabilities: ["Discovery", "Generation", "Submit for review"],
              },
            ].map((account) => (
              <div
                key={account.login}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {account.role[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium font-mono">{account.login}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-auto ${
                        account.role === "Admin"
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : "bg-sky-50 text-sky-700 border-sky-200"
                      }`}
                    >
                      {account.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{account.title}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {account.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  Password: ACN2026
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
