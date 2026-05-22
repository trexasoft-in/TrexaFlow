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
  try {
    const val = localStorage.getItem(SESSION_KEY)
    if (val) return safeParse<CentralSession>(val)
  } catch { }
  try {
    return safeParse<CentralSession>(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function setSession(session: CentralSession) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch { }
  }
}

export function clearSession() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch { }
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
  } catch { }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const val = localStorage.getItem(REFRESH_KEY)
    if (val) return val
  } catch { }
  try {
    return sessionStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function setRefreshToken(token: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(REFRESH_KEY, token)
  } catch {
    try {
      sessionStorage.setItem(REFRESH_KEY, token)
    } catch { }
  }
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
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);

  const accessToken = params.get("accesstoken");
  const refreshToken = params.get("refreshtoken");
  const userid = params.get("userid") || params.get("userId");
  const name = params.get("name") || undefined;
  const email = params.get("email") || undefined;

  if (accessToken && userid) {
    const session: CentralSession = {
      accessToken,
      user: {
        userid,
        name,
        email,
      },
    };

    setSession(session);
    if (refreshToken) setRefreshToken(refreshToken);

    const cleanUrl = new URL(window.location.href);
    ["accesstoken", "refreshtoken", "userid", "userId", "name", "email"].forEach((key) =>
      cleanUrl.searchParams.delete(key)
    );
    window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search);

    return session;
  }

  return getSession();
}