import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { isApiRequestError } from '@/api/errors'
import { getSession } from '@/api/session'
import {
  clearSessionToken,
  markSessionExpired,
  readSessionToken,
  subscribeSessionToken,
} from '@/api/session-storage'
import { accountSessionKey } from '@/features/account/session'

export function useSession() {
  const token = useSyncExternalStore(subscribeSessionToken, readSessionToken, () => null)
  const query = useQuery({
    queryKey: accountSessionKey,
    meta: { scope: 'private' },
    retry: false,
    queryFn: async () => {
      if (!readSessionToken()) {
        return null
      }

      try {
        return await getSession()
      } catch (error) {
        if (isApiRequestError(error) && error.status === 401) {
          markSessionExpired()
          clearSessionToken()
          return null
        }

        throw error
      }
    },
  })

  if (!token) {
    return { status: 'anonymous' as const, user: null }
  }

  if (query.isPending || (query.isFetching && !query.data)) {
    return { status: 'loading' as const, user: null }
  }

  if (!query.data) {
    return { status: 'anonymous' as const, user: null }
  }

  return { status: 'authenticated' as const, user: query.data.user }
}
