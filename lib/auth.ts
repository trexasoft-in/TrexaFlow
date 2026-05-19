"use client"

export type CentralUser = {
  userid: string
  email?: string
  name?: string
  fullname?: string
  avatarurl?: string
}

export type CentralSession = {
  accessToken: string
  user: CentralUser
}

const SESSION_KEY = "trexaflow.session"
const REFRESH_KEY = "trexaflow.refresh"

function safeParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function getSession(): CentralSession | null {
  if (typeof window === "undefined") return null
  return safeParse<CentralSession>(localStorage.getItem(SESSION_KEY))
}

export function setSession(session: CentralSession) {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setRefreshToken(token: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(REFRESH_KEY, token)
}

export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1]
    if (!part) return null
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = JSON.parse(atob(normalized))
    return decoded
  } catch {
    return null
  }
}

export function isTokenExpired(token?: string | null) {
  if (!token) return true
  const payload = decodeJwt(token)
  const exp = typeof payload?.exp === "number" ? payload.exp : 0
  return !exp || Date.now() >= exp * 1000
}

export function bootstrapCentralAuthSession(): CentralSession | null {
  if (typeof window === "undefined") return null

  const url = new URL(window.location.href)
  const accessToken = url.searchParams.get("accesstoken") || url.searchParams.get("accessToken")
  const refreshToken = url.searchParams.get("refreshtoken") || url.searchParams.get("refreshToken")
  const userId = url.searchParams.get("userid") || url.searchParams.get("userId")
  const email = url.searchParams.get("email") || undefined
  const name =
    url.searchParams.get("name") ||
    url.searchParams.get("fullname") ||
    undefined
  const avatarurl = url.searchParams.get("avatarurl") || undefined

  if (!accessToken || !userId) return null

  const session: CentralSession = {
    accessToken,
    user: {
      userid: userId,
      email,
      name,
      fullname: name,
      avatarurl,
    },
  }

  setSession(session)
  if (refreshToken) setRefreshToken(refreshToken)

  ;[
    "accesstoken",
    "accessToken",
    "refreshtoken",
    "refreshToken",
    "userid",
    "userId",
    "email",
    "name",
    "fullname",
    "avatarurl",
  ].forEach((key) => url.searchParams.delete(key))

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
  return session
}
