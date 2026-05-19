"use client"

import { clearSession } from "@/lib/auth"

function stripTrailingSlash(value?: string) {
  return value?.replace(/\/$/, "") ?? ""
}

export function getCentralAuthBase() {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_CENTRALAUTH_APP_URL)
}

export function getCentralAuthApiBase() {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_CENTRALAUTH_API_URL)
}

function buildCentralAuthUrl(path: string, returnTo?: string) {
  const base = getCentralAuthBase()
  const next = encodeURIComponent(returnTo || window.location.href)
  return `${base}${path}?returnTo=${next}`
}

export function goToCentralLogin(returnTo?: string) {
  window.location.href = buildCentralAuthUrl("/auth/login", returnTo)
}

export function goToCentralSignup(returnTo?: string) {
  window.location.href = buildCentralAuthUrl("/auth/signup", returnTo)
}

export function goToCentralForgotPassword(returnTo?: string) {
  window.location.href = buildCentralAuthUrl("/auth/forgot-password", returnTo)
}

export function goToCentralLogout(returnTo?: string) {
  clearSession()
  window.location.href = buildCentralAuthUrl("/auth/logout", returnTo || window.location.origin)
}
