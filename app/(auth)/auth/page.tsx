"use client"

import { useEffect, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { goToCentralForgotPassword, goToCentralLogin, goToCentralSignup } from "@/lib/centralAuth"

function AuthPageInner() {
  const params = useSearchParams()

  useEffect(() => {
    const origin = window.location.origin
    const returnTo = params.get("returnTo") ?? `${origin}/auth/callback`

    const mode = params.get("mode")

    if (mode === "signup") {
      goToCentralSignup(returnTo)
      return
    }

    if (mode === "forgot") {
      goToCentralForgotPassword(returnTo)
      return
    }

    goToCentralLogin(returnTo)
  }, [params])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
        <span>Redirecting to TrexaSoft authentication...</span>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  )
}