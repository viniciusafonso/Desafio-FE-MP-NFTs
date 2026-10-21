import { io, type Socket } from 'socket.io-client'

let currentSocket: Socket | null = null

export async function openMarketplaceSocket() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { prepareRealtimeMocks } = await import('@/mocks/browser')
    await prepareRealtimeMocks()
  }
  return io({
    forceNew: true,
    autoConnect: false,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 400,
    timeout: 8000,
  })
}

export function setMarketplaceSocket(socket: Socket | null) {
  currentSocket = socket
}

export function getMarketplaceSocket() {
  return currentSocket
}
