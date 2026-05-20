import axios from "axios";
import { getRefreshToken, getSession, setSession, setRefreshToken } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

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
      const { data } = await axios.post(`${base}/auth/refresh`, {
        refreshToken,
      });

      const nextToken = data?.accessToken ?? data?.accesstoken;
      if (!nextToken) return null;

      const nextSession: CentralSession = {
        accessToken: nextToken,
        user: stored.user,
      };

      setSession(nextSession);
      setRefreshToken(refreshToken);
      useAuthStore.getState().setSession(nextSession);

      try {
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