"use client"

import { clearSession } from "@/lib/auth"
import { env } from "@/lib/env"

export function getCentralAuthBase() {
  return env.centralAuthAppUrl
}

export function getCentralAuthApiBase() {
  return env.centralAuthApiUrl
}

function buildCentralAuthUrl(path: string, returnTo?: string) {
  const base = getCentralAuthBase()
  if (!base) throw new Error("Central auth base URL is missing")
  const next = encodeURIComponent(returnTo ?? (typeof window !== "undefined" ? window.location.href : ""))
  return `${base}${path}?returnTo=${next}`
}

export function goToCentralLogin(returnTo?: string) {
  if (typeof window !== "undefined") {
    window.location.href = buildCentralAuthUrl("/auth/login", returnTo)
  }
}

export function goToCentralSignup(returnTo?: string) {
  if (typeof window !== "undefined") {
    window.location.href = buildCentralAuthUrl("/auth/signup", returnTo)
  }
}

export function goToCentralForgotPassword(returnTo?: string) {
  if (typeof window !== "undefined") {
    window.location.href = buildCentralAuthUrl("/auth/forgot-password", returnTo)
  }
}

export function goToCentralLogout(returnTo?: string) {
  clearSession()
  if (typeof window !== "undefined") {
    window.location.href = buildCentralAuthUrl("/auth/logout", returnTo || window.location.origin)
  }
}
