import { useQuery } from '@tanstack/react-query'
import { isApiRequestError } from '@/api/errors'
import { getOrder } from '@/api/orders'
import type { OrderReceipt } from '@/api/contracts/orders'
import { markSessionExpired, clearSessionToken } from '@/api/session-storage'
import { rememberVersion } from '@/realtime/versions'

export const orderKeys = {
  detail: (orderId: string) => ['orders', 'detail', orderId] as const,
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    meta: { scope: 'private' },
    queryFn: async ({ signal, client }) => {
      try {
        const next = await getOrder(orderId, signal)
        const cached = client.getQueryData<OrderReceipt>(orderKeys.detail(orderId))
        if (cached && cached.version > next.version) {
          return cached
        }
        rememberVersion('order', next.id, next.version)
        return next
      } catch (error) {
        if (isApiRequestError(error) && error.status === 401) {
          markSessionExpired()
          clearSessionToken()
        }
        throw error
      }
    },
    retry: (failureCount, error) => {
      if (isApiRequestError(error) && (error.status === 401 || error.status === 404)) {
        return false
      }
      return failureCount < 1
    },
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 15_000 : false),
  })
}
