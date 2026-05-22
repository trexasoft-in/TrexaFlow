"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  bootstrapCentralAuthSession,
  getRefreshToken,
  isTokenExpired,
  setSession,
  clearSession,
} from "@/lib/auth";
import { env } from "@/lib/env";
import { applySupabaseAccessToken } from "@/lib/supabase";
import { safeRedirectToLogin } from "@/lib/authRedirect";

export function useAuthBootstrap() {
  const setStoreSession = useAuthStore((s) => s.setSession);
  const clearStoreSession = useAuthStore((s) => s.clearSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const session = bootstrapCentralAuthSession();

      if (!session?.accessToken || !session?.user?.userid) {
        if (mounted) {
          clearStoreSession();
          applySupabaseAccessToken(null);
          setHydrated(true);
        }
        return;
      }

      if (isTokenExpired(session.accessToken)) {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          if (mounted) {
            clearStoreSession();
            applySupabaseAccessToken(null);
            setHydrated(true);
          }
          return;
        }

        try {
          const res = await fetch(`${env.centralAuthApiUrl}auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!res.ok) {
            if (mounted) {
              clearSession();
              clearStoreSession();
              applySupabaseAccessToken(null);
              setHydrated(true);
            }
            return;
          }

          const data = await res.json();
          const nextAccessToken =
            data?.accessToken ?? data?.accesstoken ?? null;

          if (!nextAccessToken) {
            if (mounted) {
              clearSession();
              clearStoreSession();
              applySupabaseAccessToken(null);
              setHydrated(true);
            }
            return;
          }

          const refreshedSession = {
            accessToken: nextAccessToken,
            user: session.user,
          };

          setSession(refreshedSession);

          if (mounted) {
            setStoreSession(refreshedSession);
            applySupabaseAccessToken(null);
            setHydrated(true);
          }
          return;
        } catch {
          if (mounted) {
            clearSession();
            clearStoreSession();
            applySupabaseAccessToken(null);
            setHydrated(true);
          }
          return;
        }
      }

      if (mounted) {
        setStoreSession(session);
        applySupabaseAccessToken(null);
        setHydrated(true);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [setStoreSession, clearStoreSession, setHydrated]);
}

export function useRequireAuth() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useAuthBootstrap();

  useEffect(() => {
    if (!hydrated) return;
    if (!user?.userid) safeRedirectToLogin();
  }, [hydrated, user?.userid]);

  const normalizedUser = user
    ? { ...user, id: user.userid, userid: user.userid }
    : null;

  return {
    user: normalizedUser,
    userId: user?.userid ?? null,
    checking: !hydrated,
  };
}

export function useRedirectIfAuthed() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useAuthBootstrap();

  useEffect(() => {
    if (!hydrated || !user?.userid) return;

    const go = async () => {
      try {
        const token = useAuthStore.getState().accessToken;
        if (!token) return;

        const res = await fetch("/api/me/bootstrap", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          router.replace("/onboarding");
          return;
        }

        const data = await res.json();
        if (data.workspaceId) router.replace(`/workspace/${data.workspaceId}`);
        else router.replace("/onboarding");
      } catch (err) {
        console.error("Failed to check workspace redirect", err);
        router.replace("/onboarding");
      }
    };

    go();
  }, [hydrated, user?.userid, router]);

  return {
    checking: !hydrated,
  };
}