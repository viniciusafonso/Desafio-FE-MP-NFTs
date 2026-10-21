import type { QueryClient } from '@tanstack/react-query'
import { clearOrderAttempt } from '@/api/checkout-attempt'
import { logout } from '@/api/session'
import { clearSessionToken, readSessionToken } from '@/api/session-storage'

export const accountSessionKey = ['account', 'session'] as const

export function clearPrivateQueries(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => query.meta?.scope === 'private',
  })
}

export async function signOut(queryClient: QueryClient) {
  try {
    if (readSessionToken()) {
      await logout()
    }
  } catch {
    // A sessão local termina mesmo quando a simulação já não reconhece o token.
  }

  clearSessionToken()
  clearOrderAttempt()
  clearPrivateQueries(queryClient)
}
