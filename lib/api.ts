"use client"

import axios from "axios"
import { clearSession, getRefreshToken, getSession, setSession } from "@/lib/auth"
import { getCentralAuthApiBase, goToCentralLogin } from "@/lib/centralAuth"
import { useAuthStore } from "@/store/useAuthStore"

const api = axios.create()

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing

  refreshing = (async () => {
    const refreshToken = getRefreshToken()
    const stored = getSession()
    const base = getCentralAuthApiBase()

    if (!refreshToken || !stored?.user || !base) return null

    try {
      const { data } = await axios.post(`${base}/api/auth/refresh`, {
        refreshtoken: refreshToken,
      })

      const nextToken = data?.accesstoken || data?.accessToken
      if (!nextToken) return null

      const nextSession = {
        accessToken: nextToken,
        user: stored.user,
      }

      setSession(nextSession)
      useAuthStore.getState().setSession(nextSession)
      return nextToken
    } catch {
      return null
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

api.interceptors.request.use(async (config) => {
  const stored = getSession()
  if (stored?.accessToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${stored.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error?.response?.status !== 401 || original?._retry) {
      return Promise.reject(error)
    }

    original._retry = true
    const newToken = await refreshAccessToken()

    if (!newToken) {
      clearSession()
      useAuthStore.getState().clearSession()
      if (typeof window !== "undefined") {
        goToCentralLogin(window.location.href)
      }
      return Promise.reject(error)
    }

    original.headers = original.headers || {}
    original.headers.Authorization = `Bearer ${newToken}`
    return api(original)
  }
)

export default api
