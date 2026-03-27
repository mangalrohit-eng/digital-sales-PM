"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, ArrowRight, AlertCircle } from "lucide-react"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email: username.trim(),
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid username or password. Please try again.")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <p className="text-lg font-semibold tracking-tight text-primary">
            {APP_NAME}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{APP_TAGLINE}</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-6">
            Sign in
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Enter your username and password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="username"
              className="text-zinc-400 text-xs font-medium tracking-wide uppercase"
            >
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder=""
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="h-11 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary focus-visible:border-primary/60"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-zinc-400 text-xs font-medium tracking-wide uppercase"
            >
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
                autoComplete="current-password"
                className="h-11 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary focus-visible:border-primary/60 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            <div
              className="flex items-center gap-2.5 text-xs text-red-400 bg-red-950/50 border border-red-900/60 rounded-lg px-3.5 py-2.5"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold text-sm gap-2 mt-2"
            disabled={loading || !username.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
