"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { goToCentralLogin } from "@/lib/centralAuth"
import { useAuthBootstrap } from "@/lib/useAuth"
import { useAuthStore } from "@/store/useAuthStore"

export default function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  useAuthBootstrap()

  useEffect(() => {
    if (!hydrated) return
    if (!user?.userid) {
      goToCentralLogin(window.location.href)
    }
  }, [hydrated, user?.userid])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          <span>Loading your workspace...</span>
        </div>
      </div>
    )
  }

  if (!user?.userid) return null

  return <>{children}</>
}
