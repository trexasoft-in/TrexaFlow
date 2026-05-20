'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { goToCentralLogin } from '@/lib/centralAuth';

export default function LoginPage() {
  useEffect(() => {
    goToCentralLogin(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Redirecting to TrexaSoft authentication...</span>
      </div>
    </div>
  );
}
