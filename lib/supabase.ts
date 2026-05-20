import { createBrowserClient } from '@supabase/ssr'
import { getSession } from './auth'
import { env } from './env'

export const supabase = createBrowserClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    global: {
      fetch: (url, options = {}) => {
        const session = getSession()
        const headers = new Headers((options as RequestInit).headers)
        if (session?.accessToken) {
          headers.set('Authorization', `Bearer ${session.accessToken}`)
        }
        return fetch(url, { ...options, headers })
      }
    }
  }
)
