import { create } from 'zustand';
import type { CentralUser, CentralSession } from '@/lib/auth';

type AuthStore = {
  accessToken: string | null;
  refreshToken: string | null;
  user: CentralUser | null;
  /** True once useAuthBootstrap has finished its async init. */
  hydrated: boolean;
  setSession: (session: CentralSession & { refreshToken?: string }) => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  // Rehydrate from localStorage on store init
  accessToken: (() => {
    if (typeof window === 'undefined') return null;
    try {
      const s = localStorage.getItem('trexaflow.session');
      return s ? (JSON.parse(s).accessToken ?? null) : null;
    } catch {
      return null;
    }
  })(),
  refreshToken: (() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('trexaflow.refresh') ?? null;
    } catch {
      return null;
    }
  })(),
  user: (() => {
    if (typeof window === 'undefined') return null;
    try {
      const s = localStorage.getItem('trexaflow.session');
      return s ? (JSON.parse(s).user ?? null) : null;
    } catch {
      return null;
    }
  })(),
  // Start as false; useAuthBootstrap sets it to true when init is done.
  hydrated: false,

  setSession: (session) => {
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken ?? null,
      user: session.user,
    });
  },

  clearSession: () => {
    set({ accessToken: null, refreshToken: null, user: null });
  },

  setHydrated: (value) => set({ hydrated: value }),
}));
