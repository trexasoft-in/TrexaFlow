"use client"

import axios from "axios"
import { getSession } from "@/lib/auth"
import { refreshSessionShared } from "@/lib/refreshSession"
import { safeRedirectToLogin } from "@/lib/authRedirect"

const api = axios.create()

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
    const session = await refreshSessionShared()

    if (!session?.accessToken) {
      safeRedirectToLogin()
      return Promise.reject(error)
    }

    original.headers = original.headers || {}
    original.headers.Authorization = `Bearer ${session.accessToken}`
    return api(original)
  }
)

export default api
