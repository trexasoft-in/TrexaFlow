"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  bootstrapCentralAuthSession,
  clearSession,
  getSession,
  isTokenExpired,
} from "@/lib/auth"
import { safeRedirectToLogin } from "@/lib/authRedirect"
import { useAuthStore } from "@/store/useAuthStore"
import { refreshSessionShared } from "@/lib/refreshSession"

export function useAuthBootstrap() {
  const setStoreSession = useAuthStore((s) => s.setSession);
  const clearStoreSession = useAuthStore((s) => s.clearSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let mounted = true;

    const applyRealtimeAuth = async (token: string) => {
      const { supabase } = await import('./supabase');
      supabase.realtime.setAuth(token);
    };

    const init = async () => {
      const fromUrl = bootstrapCentralAuthSession();
      if (fromUrl?.accessToken && fromUrl?.user) {
        if (!mounted) return;
        setStoreSession(fromUrl);
        await applyRealtimeAuth(fromUrl.accessToken);
        return;
      }

      const stored = getSession();
      if (stored?.accessToken && stored?.user && !isTokenExpired(stored.accessToken)) {
        if (!mounted) return;
        setStoreSession(stored);
        await applyRealtimeAuth(stored.accessToken);
        return;
      }

      const refreshed = await refreshSessionShared();
      if (refreshed?.accessToken && refreshed?.user) {
        if (!mounted) return;
        setStoreSession(refreshed);
        await applyRealtimeAuth(refreshed.accessToken);
        return;
      }

      clearSession();
      if (!mounted) return;
      clearStoreSession();
      setHydrated(true);
    };

    init();
    return () => {
      mounted = false;
    };
  }, [setStoreSession, clearStoreSession, setHydrated]);
}

export function useRequireAuth() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  useAuthBootstrap()

  useEffect(() => {
    if (!hydrated) return
    if (!user?.userid) {
      safeRedirectToLogin()
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