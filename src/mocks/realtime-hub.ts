import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts/realtime'

type LiveClient = {
  id: string
  userId: string | null
  close: () => void
  emit: (name: string, payload: NftUpdatedEvent | OrderUpdatedEvent) => void
}

const clients = new Set<LiveClient>()

export function trackRealtimeClient(client: LiveClient) {
  clients.add(client)
  return () => {
    clients.delete(client)
  }
}

export function bindRealtimeUser(id: string, userId: string | null) {
  for (const client of clients) {
    if (client.id === id) {
      client.userId = userId
    }
  }
}

export function emitNftUpdated(event: NftUpdatedEvent) {
  for (const client of clients) {
    client.emit('nft.updated', event)
  }
}

export function emitOrderUpdated(event: OrderUpdatedEvent) {
  for (const client of clients) {
    if (client.userId && client.userId === event.order.userId) {
      client.emit('order.updated', event)
    }
  }
}

let pausedUntil = 0
export function realtimeIsPaused() { return Date.now() < pausedUntil }
export function pauseRealtime(durationMs: number) {
  pausedUntil = Date.now() + durationMs
  const count = clients.size
  for (const client of clients) client.close()
  clients.clear()
  return count
}
