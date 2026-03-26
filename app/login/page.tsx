"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, Loader2, Zap } from "lucide-react"

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
    <div className="min-h-screen flex items-center justify-center bg-[oklch(0.18_0.04_252)] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/30">
            <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Digital Sales AI
            </h1>
            <p className="text-sm text-white/50 mt-1">Charter Communications</p>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Sign in</h2>
              <p className="text-sm text-white/50 mt-1">
                Access your CRO workflow workspace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/70 text-xs font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@charter.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/70 text-xs font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/30"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-xs text-white/40 text-center mb-3">
                Demo accounts
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fillDemo("admin")}
                  className="text-xs px-3 py-2 rounded-md border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all text-left"
                >
                  <div className="font-medium text-white/80">Admin</div>
                  <div className="text-white/40 truncate">admin@charter.com</div>
                </button>
                <button
                  onClick={() => fillDemo("analyst")}
                  className="text-xs px-3 py-2 rounded-md border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all text-left"
                >
                  <div className="font-medium text-white/80">Analyst</div>
                  <div className="text-white/40 truncate">analyst@charter.com</div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/25 mt-6">
          Internal tool — Charter Communications © 2025
        </p>
      </div>
    </div>
  )
}
