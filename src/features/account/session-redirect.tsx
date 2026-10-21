import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { clearSessionNotice, readSessionNotice } from '@/api/session-storage'
import { useSession } from '@/features/account/use-session'

export function SessionExpirationRedirect() {
  const session = useSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const href = useRouterState({ select: (state) => state.location.href })

  useEffect(() => {
    if (session.status !== 'anonymous' || readSessionNotice() !== 'expired') {
      return
    }

    if (pathname === '/login' || pathname === '/register') {
      return
    }

    clearSessionNotice()
    void navigate({
      to: '/login',
      search: {
        redirect: href,
        notice: 'expired',
      },
    })
  }, [href, navigate, pathname, session.status])

  return null
}
