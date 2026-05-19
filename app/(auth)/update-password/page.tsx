"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { goToCentralForgotPassword } from "@/lib/centralAuth"

export default function UpdatePasswordPage() {
  useEffect(() => {
    goToCentralForgotPassword(window.location.origin)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
        <span>Redirecting to TrexaSoft password recovery...</span>
      </div>
    </div>
  )
}
