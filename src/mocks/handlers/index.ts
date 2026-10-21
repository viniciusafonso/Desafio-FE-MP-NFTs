import { pauseRealtime } from '@/mocks/realtime-hub'
import { http } from 'msw'
import { shiftCatalogNft } from '@/mocks/catalog-shift'
import { resetSimulation, updateSimulation } from '@/mocks/db'
import { settleOrder } from '@/mocks/place-order'
import { simulationError } from '@/mocks/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export const simulationHandlers = [
  http.post('/api/simulation/realtime-outage', async ({ request }) => {
    const body = await request.json().catch(() => null)
    const duration = isRecord(body) && typeof body.durationMs === 'number' ? Math.min(10_000, Math.max(100, body.durationMs)) : 1500
    return Response.json({ disconnectedClients: pauseRealtime(duration), durationMs: duration })
  }),
  http.post('/api/simulation/reset', async () => {
    await resetSimulation()
    return new Response(null, { status: 204 })
  }),

  http.post('/api/simulation/nft-shift', async ({ request }) => {
    return shiftCatalogNft(await request.json().catch(() => null))
  }),

  http.post('/api/simulation/orders/:orderId/settle', async ({ params, request }) => {
    const body = await request.json().catch(() => null)
    const status = isRecord(body) && (body.status === 'confirmed' || body.status === 'refused') ? body.status : null
    if (!status) {
      return simulationError(422, 'validation_error', 'Informe se o pedido pendente deve ser confirmado ou recusado.')
    }

    const orderId = String(params.orderId)
    let found = false
    await updateSimulation((state) => {
      found = state.orders.some((order) => order.id === orderId && order.status === 'pending')
      return state
    })
    if (!found) {
      return simulationError(404, 'not_found', 'Não há um pedido pendente com esse identificador.')
    }

    await settleOrder(orderId, status)
    return new Response(null, { status: 204 })
  }),
]

