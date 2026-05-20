import axios from "axios";
import { getRefreshToken, getSession, setSession, setRefreshToken } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { env } from "@/lib/env";

type CentralSession = {
  accessToken: string;
  user: any;
};

let refreshing: Promise<CentralSession | null> | null = null;

export async function refreshSessionShared(): Promise<CentralSession | null> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const refreshToken = getRefreshToken();
    const stored = getSession();
    const base = env.centralAuthApiUrl;

    if (!refreshToken || !stored?.user || !base) return null;

    try {
      const { data } = await axios.post(`${base}/api/auth/refresh`, {
        refreshtoken: refreshToken,
      });

      const nextToken = data?.accesstoken || data?.accessToken;
      if (!nextToken) return null;

      const nextSession = {
        accessToken: nextToken,
        user: stored.user,
      };

      setSession(nextSession);
      setRefreshToken(refreshToken);
      useAuthStore.getState().setSession(nextSession);

      try {
        const { supabase } = await import("@/lib/supabase");
        supabase.realtime.setAuth(nextToken);
      } catch {}

      return nextSession;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}
