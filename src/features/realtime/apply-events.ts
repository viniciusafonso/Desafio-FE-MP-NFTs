import type { QueryClient } from '@tanstack/react-query'
import type { NftDetail, NftListResponse, NftSummary } from '@/api/contracts/catalog'
import type { CartView } from '@/api/contracts/cart'
import { lowestAvailablePrice, multiplyEth } from '@/api/contracts/money'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts/realtime'
import { cartKeys } from '@/features/cart/cart-state'
import { orderKeys } from '@/features/orders/order-state'
import { publishRealtimeNotice } from '@/realtime/notices'
import { acceptEvent, rememberVersion } from '@/realtime/versions'

function applySummary(item: NftSummary, event: NftUpdatedEvent) {
  if (item.id !== event.resourceId) {
    return item
  }

  const remaining = event.nft.editions.reduce((sum, edition) => sum + edition.remaining, 0)
  const total = event.nft.editions.reduce((sum, edition) => sum + edition.total, 0)
  return {
    ...item,
    priceEth: lowestAvailablePrice(event.nft.editions),
    remaining,
    total,
  }
}

function applyList(current: NftListResponse | undefined, event: NftUpdatedEvent) {
  if (!current) {
    return current
  }

  return {
    ...current,
    items: current.items.map((item) => applySummary(item, event)),
  }
}

export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  if (!acceptEvent('nft', event)) {
    return
  }

  queryClient.setQueriesData<NftListResponse>({ queryKey: ['catalog', 'list'] }, (current) => applyList(current, event))
  queryClient.setQueriesData<NftListResponse>({ queryKey: ['catalog', 'highlights'] }, (current) => applyList(current, event))
  queryClient.setQueriesData<NftDetail>({ queryKey: ['catalog', 'detail'] }, (current) => {
    if (!current || current.id !== event.resourceId) {
      return current
    }

    return {
      ...current,
      ...applySummary(current, event),
      editions: current.editions.map((edition) => {
        const next = event.nft.editions.find((item) => item.id === edition.id)
        if (!next) {
          return edition
        }
        return {
          ...edition,
          priceEth: next.priceEth,
          remaining: next.remaining,
          total: next.total,
          status: next.remaining > 0 ? 'available' : 'sold-out',
        }
      }),
    }
  })

  queryClient.setQueryData<CartView>(cartKeys.current, (current) => {
    if (!current) {
      return current
    }

    return {
      ...current,
      items: current.items.map((item) => {
        if (item.nftId !== event.resourceId) {
          return item
        }
        const edition = event.nft.editions.find((entry) => entry.id === item.editionId)
        if (!edition) {
          return item
        }
        return {
          ...item,
          unitPriceEth: edition.priceEth,
          available: edition.remaining,
          lineTotalEth: multiplyEth(edition.priceEth, item.quantity),
        }
      }),
    }
  })

  void queryClient.invalidateQueries({ queryKey: ['catalog', 'list'] })
  void queryClient.invalidateQueries({ queryKey: ['catalog', 'highlights'] })
  void queryClient.invalidateQueries({ queryKey: cartKeys.quote })
  void queryClient.invalidateQueries({ queryKey: cartKeys.current })
  publishRealtimeNotice(`O preço ou a disponibilidade de ${event.nft.title} mudou.`)
}

export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent, userId: string | null) {
  if (!userId || event.order.userId !== userId) {
    return
  }

  if (!acceptEvent('order', event)) {
    return
  }

  rememberVersion('order', event.order.id, event.order.version)
  queryClient.setQueryData(orderKeys.detail(event.order.id), event.order)
  if (event.order.status !== 'pending') {
    void queryClient.invalidateQueries({ queryKey: cartKeys.current })
    void queryClient.invalidateQueries({ queryKey: cartKeys.quote })
  }
}
