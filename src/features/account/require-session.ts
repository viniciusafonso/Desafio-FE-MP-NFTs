import { redirect } from '@tanstack/react-router'
import { readSessionToken } from '@/api/session-storage'

export function requireSession(href: string) {
  if (!readSessionToken()) {
    throw redirect({
      to: '/login',
      search: { redirect: href },
    })
  }
}
