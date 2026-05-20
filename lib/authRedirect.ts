import { clearSession } from './auth';
import { goToCentralLogin } from './centralAuth';

export function safeRedirectToLogin(returnTo?: string) {
  clearSession();
  if (typeof window !== 'undefined') {
    goToCentralLogin(returnTo ?? window.location.href);
  }
}
