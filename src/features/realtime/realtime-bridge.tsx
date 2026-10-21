import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts/realtime'
import { readSessionToken, subscribeSessionToken } from '@/api/session-storage'
import { cartKeys } from '@/features/cart/cart-state'
import { accountSessionKey } from '@/features/account/session'
import { applyNftUpdated, applyOrderUpdated } from '@/features/realtime/apply-events'
import { clearRealtimeNotice } from '@/realtime/notices'
import { forgetOrderVersions } from '@/realtime/versions'

export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const token = useSyncExternalStore(subscribeSessionToken, readSessionToken, () => null)

  useEffect(() => {
    let disposed = false
    let closeSocket = () => {}

    void import('@/realtime/socket').then(async ({ getMarketplaceSocket, openMarketplaceSocket, setMarketplaceSocket }) => {
      if (disposed) {
        return
      }

      const socket = await openMarketplaceSocket()
      if (disposed) { socket.close(); return }
      setMarketplaceSocket(socket)
      closeSocket = () => {
        socket.off('connect', onConnect)
        socket.off('nft.updated', onNft)
        socket.off('order.updated', onOrder)
        socket.close()
        if (getMarketplaceSocket() === socket) {
          setMarketplaceSocket(null)
        }
      }

      function currentUserId() {
        const session = queryClient.getQueryData<{ user: { id: string } } | null>(accountSessionKey)
        return session?.user.id ?? null
      }

      function onConnect() {
        socket.emit('session.bind', { token: readSessionToken() })
        void queryClient.invalidateQueries({ queryKey: cartKeys.current })
        void queryClient.invalidateQueries({ queryKey: cartKeys.quote })
        void queryClient.invalidateQueries({ queryKey: ['orders'] })
        void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      }

      function onNft(payload: NftUpdatedEvent) {
        applyNftUpdated(queryClient, payload)
      }

      function onOrder(payload: OrderUpdatedEvent) {
        if (!readSessionToken()) {
          return
        }
        applyOrderUpdated(queryClient, payload, currentUserId())
      }

      socket.on('connect', onConnect)
      socket.on('nft.updated', onNft)
      socket.on('order.updated', onOrder)
      socket.connect()
    })

    return () => {
      disposed = true
      closeSocket()
    }
  }, [queryClient])

  useEffect(() => {
    forgetOrderVersions()
    clearRealtimeNotice()
    void import('@/realtime/socket').then(({ getMarketplaceSocket }) => {
      const socket = getMarketplaceSocket()
      if (socket?.connected) {
        socket.emit('session.bind', { token })
      }
    })
  }, [token])

  return null
}
