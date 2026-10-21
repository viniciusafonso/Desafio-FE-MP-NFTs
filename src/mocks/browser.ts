import { setupWorker } from 'msw/browser'
import { cartHandlers } from '@/mocks/handlers/cart'
import { catalogHandlers } from '@/mocks/handlers/catalog'
import { orderHandlers } from '@/mocks/handlers/orders'
import { profileHandlers } from '@/mocks/handlers/profile'
import { sessionHandlers } from '@/mocks/handlers/session'
import { simulationHandlers } from '@/mocks/handlers/index'
import { walletHandlers } from '@/mocks/handlers/wallets'

const worker = setupWorker(
  ...sessionHandlers,
  ...profileHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...walletHandlers,
  ...orderHandlers,
  ...simulationHandlers,
)

export function startMockWorker() {
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}

let realtimeReady: Promise<void> | undefined
export function prepareRealtimeMocks() {
  realtimeReady ??= import('@/mocks/handlers/realtime').then(({ realtimeHandlers }) => { worker.use(...realtimeHandlers) })
  return realtimeReady
}
