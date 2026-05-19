import { create } from "zustand"
import type { CentralSession, CentralUser } from "@/lib/auth"

type AuthState = {
  user: CentralUser | null
  accessToken: string | null
  hydrated: boolean
  setSession: (session: CentralSession | null) => void
  clearSession: () => void
  setHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  setSession: (session) =>
    set({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      hydrated: true,
    }),
  clearSession: () =>
    set({
      user: null,
      accessToken: null,
      hydrated: true,
    }),
  setHydrated: (value) => set({ hydrated: value }),
}))
