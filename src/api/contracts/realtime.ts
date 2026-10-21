import type { OrderReceipt } from '@/api/contracts/orders'

export type NftUpdatedEvent = {
  eventId: string
  resourceId: string
  version: number
  occurredAt: string
  nft: {
    id: string
    title: string
    editions: Array<{
      id: string
      priceEth: string
      remaining: number
      total: number
    }>
  }
}

export type OrderUpdatedEvent = {
  eventId: string
  resourceId: string
  version: number
  occurredAt: string
  order: OrderReceipt
}
