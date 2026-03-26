"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password. Please try again.")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  const fillDemo = (role: "admin" | "analyst") => {
    if (role === "admin") {
      setEmail("admin@charter.com")
      setPassword("charter123")
    } else {
      setEmail("analyst@charter.com")
      setPassword("charter123")
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[oklch(0.10_0.025_253)]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.18_0.06_254)] via-[oklch(0.14_0.04_253)] to-[oklch(0.10_0.025_253)]" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.50 0.19 254 / 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, oklch(0.55 0.20 280 / 0.10) 0%, transparent 50%)"
        }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle, oklch(0.60 0.10 254) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Digital Sales AI</p>
            <p className="text-white/40 text-[11px] leading-tight">Charter Communications</p>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-primary/90 font-medium">AI-Powered Workflow</span>
          </div>
          <h1 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight mb-5">
            Ship better<br />
            <span className="text-primary">CRO ideas,</span><br />
            faster.
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Brainstorm, generate BRDs, epics, and user stories with AI — then approve and push directly to Jira.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 flex flex-col gap-3">
          {[
            { icon: "✦", text: "GPT-4o powered artifact generation" },
            { icon: "✦", text: "Full BRD → Epic → Story → Test Case chain" },
            { icon: "✦", text: "Role-based approval workflow" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3">
              <span className="text-primary text-xs">{f.icon}</span>
              <span className="text-white/40 text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-[oklch(0.10_0.025_253)]" />

        <div className="relative z-10 w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Digital Sales AI</p>
              <p className="text-white/35 text-[10px]">Charter Communications</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-white/40 text-sm mt-1.5">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/55 text-xs font-medium tracking-wide uppercase">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@charter.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-white/6 border-white/12 text-white placeholder:text-white/25 focus-visible:ring-primary focus-visible:border-primary/60 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/55 text-xs font-medium tracking-wide uppercase">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-white/6 border-white/12 text-white placeholder:text-white/25 focus-visible:ring-primary focus-visible:border-primary/60 pr-11 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-xs text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3.5 py-2.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-lg shadow-primary/25 gap-2 mt-2 transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-7 pt-6 border-t border-white/8">
            <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium text-center mb-3.5">
              Demo accounts — click to fill
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { role: "admin" as const, label: "Admin", email: "admin@charter.com", desc: "Director, Digital Sales" },
                { role: "analyst" as const, label: "Analyst", email: "analyst@charter.com", desc: "CRO Analyst" },
              ].map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => fillDemo(acc.role)}
                  className="group text-left px-3.5 py-3 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${acc.role === "admin" ? "bg-violet-500/20 text-violet-400" : "bg-sky-500/20 text-sky-400"}`}>
                      {acc.label[0]}
                    </div>
                    <span className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-colors">{acc.label}</span>
                  </div>
                  <p className="text-[11px] text-white/30 truncate">{acc.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-white/20 mt-3">Password: charter123</p>
          </div>

          <p className="text-center text-[11px] text-white/15 mt-8">
            Charter Communications Internal Tool · 2025
          </p>
        </div>
      </div>
    </div>
  )
}
