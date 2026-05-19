"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
  bootstrapCentralAuthSession,
  clearSession,
  getRefreshToken,
  getSession,
  isTokenExpired,
  setSession,
  setRefreshToken,
} from "@/lib/auth"
import { goToCentralLogin } from "@/lib/centralAuth"
import { useAuthStore } from "@/store/useAuthStore"

type CentralRefreshResponse = {
  accesstoken?: string
  accessToken?: string
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  const stored = getSession()

  if (!refreshToken || !stored?.user) return null

  const base = process.env.NEXT_PUBLIC_CENTRALAUTH_API_URL?.replace(/\/$/, "")
  if (!base) return null

  try {
    const { data } = await axios.post<CentralRefreshResponse>(`${base}/api/auth/refresh`, {
      refreshtoken: refreshToken,
    })

    const newToken = data?.accesstoken || data?.accessToken
    if (!newToken) return null

    const refreshed = {
      accessToken: newToken,
      user: stored.user,
    }

    setSession(refreshed)
    setRefreshToken(refreshToken)
    return refreshed
  } catch {
    return null
  }
}

export function useAuthBootstrap() {
  const setStoreSession = useAuthStore((s) => s.setSession)
  const clearStoreSession = useAuthStore((s) => s.clearSession)
  const setHydrated = useAuthStore((s) => s.setHydrated)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const fromUrl = bootstrapCentralAuthSession()
      if (fromUrl?.accessToken && fromUrl?.user) {
        if (!mounted) return
        setStoreSession(fromUrl)
        return
      }

      const stored = getSession()
      if (stored?.accessToken && stored?.user && !isTokenExpired(stored.accessToken)) {
        if (!mounted) return
        setStoreSession(stored)
        return
      }

      const refreshed = await refreshAccessToken()
      if (refreshed?.accessToken && refreshed?.user) {
        if (!mounted) return
        setStoreSession(refreshed)
        return
      }

      clearSession()
      if (!mounted) return
      clearStoreSession()
      setHydrated(true)
    }

    init()
    return () => {
      mounted = false
    }
  }, [setStoreSession, clearStoreSession, setHydrated])
}

export function useRequireAuth() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  useAuthBootstrap()

  useEffect(() => {
    if (!hydrated) return
    if (!user?.userid) {
      goToCentralLogin(window.location.href)
    }
  }, [hydrated, user?.userid, router])

  return {
    user,
    userId: user?.userid ?? null,
    checking: !hydrated,
  }
}

export function useRedirectIfAuthed() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  useAuthBootstrap()

  useEffect(() => {
    if (!hydrated || !user?.userid) return

    const go = async () => {
      const { supabase } = await import("@/lib/supabase")

      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.userid)
        .limit(1)
        .single()

      if (membership?.workspace_id) {
        router.replace(`/workspace/${membership.workspace_id}`)
      } else {
        router.replace("/onboarding")
      }
    }

    go()
  }, [hydrated, user?.userid, router])

  return {
    checking: !hydrated,
  }
}