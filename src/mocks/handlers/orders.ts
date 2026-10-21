import { http } from 'msw'
import type { CreateOrderRequest } from '@/api/contracts/orders'
import { isPaymentNetwork } from '@/api/contracts/wallets'
import { requireCollector } from '@/mocks/access'
import { readScenario, updateSimulation } from '@/mocks/db'
import { placeOrder, presentOrder } from '@/mocks/place-order'
import { beginScenario, simulationError } from '@/mocks/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readQuote(value: unknown): CreateOrderRequest['quote'] | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null
  }

  const items = value.items.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }
    if (
      typeof item.lineId !== 'string' ||
      typeof item.nftId !== 'string' ||
      typeof item.editionId !== 'string' ||
      typeof item.unitPriceEth !== 'string' ||
      typeof item.quantity !== 'number'
    ) {
      return []
    }
    return [
      {
        lineId: item.lineId,
        nftId: item.nftId,
        editionId: item.editionId,
        unitPriceEth: item.unitPriceEth,
        quantity: item.quantity,
      },
    ]
  })

  if (
    typeof value.subtotalEth !== 'string' ||
    typeof value.discountEth !== 'string' ||
    typeof value.networkFeeEth !== 'string' ||
    typeof value.totalEth !== 'string' ||
    items.length !== value.items.length
  ) {
    return null
  }

  return {
    subtotalEth: value.subtotalEth,
    discountEth: value.discountEth,
    networkFeeEth: value.networkFeeEth,
    totalEth: value.totalEth,
    couponCode: typeof value.couponCode === 'string' ? value.couponCode : null,
    items,
  }
}

function readOrderBody(value: unknown): CreateOrderRequest | null {
  if (!isRecord(value) || typeof value.buyerName !== 'string' || typeof value.walletId !== 'string') {
    return null
  }
  if (!isPaymentNetwork(value.network)) {
    return null
  }
  const quote = readQuote(value.quote)
  if (!quote) {
    return null
  }
  return {
    collector: isRecord(value.collector) ? Object.fromEntries(Object.entries(value.collector).filter((entry): entry is [string, string] => typeof entry[1] === 'string').map(([key, text]) => [key, text.slice(0, 1000)])) : undefined,
    buyerName: value.buyerName,
    walletId: value.walletId,
    network: value.network,
    quote,
  }
}

const idempotencyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    const key = request.headers.get('Idempotency-Key') ?? ''
    if (!idempotencyPattern.test(key)) {
      return simulationError(422, 'validation_error', 'A tentativa de pagamento não tem uma chave válida.', {
        idempotencyKey: 'Envie a chave de idempotência.',
      })
    }

    const body = readOrderBody(await request.json().catch(() => null))
    if (!body) {
      return simulationError(422, 'validation_error', 'Revise os dados do pagamento.')
    }

    return placeOrder(access.user, key, body, scenario)
  }),

  http.get('/api/orders/:orderId', async ({ params, request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    const orderId = String(params.orderId)
    let response: Response | null = null
    await updateSimulation((state) => {
      const order = state.orders.find((item) => item.id === orderId && item.userId === access.user.id)
      response = order ? Response.json(presentOrder(order)) : simulationError(404, 'not_found', 'Pedido não encontrado.')
      return state
    })

    return response ?? simulationError(404, 'not_found', 'Pedido não encontrado.')
  }),
]
