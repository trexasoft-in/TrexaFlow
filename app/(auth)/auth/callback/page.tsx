'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bootstrapCentralAuthSession } from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, applySupabaseAccessToken } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let done = false;

    const run = async () => {
      const session = bootstrapCentralAuthSession();

      if (!session?.accessToken || !session?.user?.userid) {
        router.replace('/auth');
        return;
      }

      setSession(session);
      applySupabaseAccessToken(session.accessToken);

      try {
        const res = await fetch('/api/me/bootstrap', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        if (res.status === 401) {
          router.replace('/auth');
          return;
        }

        const data = await res.json();

        if (done) return;

        if (data.workspaceId) {
          router.replace(`/workspace/${data.workspaceId}`);
          return;
        }

        router.replace('/onboarding');
      } catch {
        if (!done) router.replace('/onboarding');
      }
    };

    run();
    return () => {
      done = true;
    };
  }, [router, setSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span>Signing you in...</span>
      </div>
    </div>
  );
}
