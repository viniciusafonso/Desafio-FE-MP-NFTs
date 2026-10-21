import { validateCheckoutCollector } from '@/api/contracts/checkout-validation'
import { delay } from 'msw'
import type { MockScenario } from '@/api/contracts/scenarios'
import { addEth } from '@/api/contracts/money'
import { orderFingerprint, quoteFingerprint, type CreateOrderRequest, type OrderReceipt } from '@/api/contracts/orders'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts/realtime'
import { networkName } from '@/api/contracts/wallets'
import { presentCart, quoteCart } from '@/mocks/cart-view'
import { updateSimulation, type MockOrder, type MockUser } from '@/mocks/db'
import type { CatalogNftRecord } from '@/mocks/fixtures/nfts'
import { emitNftUpdated, emitOrderUpdated } from '@/mocks/realtime-hub'
import { simulationError } from '@/mocks/http'

export function presentOrder(order: MockOrder): OrderReceipt {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    version: order.version,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    collector: order.collector,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    walletId: order.walletId,
    walletLabel: order.walletLabel,
    walletAddress: order.walletAddress,
    networkId: order.networkId,
    networkName: order.networkName,
    subtotalEth: order.subtotalEth,
    discountEth: order.discountEth,
    networkFeeEth: order.networkFeeEth,
    totalEth: order.totalEth,
    couponCode: order.couponCode,
    couponPercent: order.couponPercent,
    items: order.items.map((item) => ({ ...item })),
    transactionRef: order.transactionRef,
    refusalReason: order.refusalReason,
  }
}

export function nftUpdatedEvent(nft: CatalogNftRecord): NftUpdatedEvent {
  return {
    eventId: `evt_${crypto.randomUUID()}`,
    resourceId: nft.id,
    version: nft.version ?? 1,
    occurredAt: new Date().toISOString(),
    nft: {
      id: nft.id,
      title: nft.title,
      editions: nft.editions.map((edition) => ({
        id: edition.id,
        priceEth: edition.priceEth,
        remaining: edition.remaining,
        total: edition.total,
      })),
    },
  }
}

function orderUpdatedEvent(order: MockOrder): OrderUpdatedEvent {
  const receipt = presentOrder(order)
  return {
    eventId: `evt_${crypto.randomUUID()}`,
    resourceId: order.id,
    version: order.version,
    occurredAt: order.updatedAt,
    order: receipt,
  }
}

function eventsFor(nfts: Set<CatalogNftRecord>) {
  const events: NftUpdatedEvent[] = []
  for (const nft of nfts) {
    nft.version = (nft.version ?? 1) + 1
    events.push(nftUpdatedEvent(nft))
  }
  return events
}

export async function settleOrder(orderId: string, next: 'confirmed' | 'refused') {
  const nftEvents: NftUpdatedEvent[] = []
  let orderEvent: OrderUpdatedEvent | null = null

  await updateSimulation((state) => {
    const order = state.orders.find((item) => item.id === orderId)
    if (!order || order.status !== 'pending') {
      return state
    }

    const touched = new Set<CatalogNftRecord>()
    if (next === 'refused') {
      for (const bought of order.items) {
        const nft = state.nfts.find((item) => item.id === bought.nftId)
        const edition = nft?.editions.find((item) => item.id === bought.editionId)
        if (!nft || !edition) {
          continue
        }
        edition.remaining = Math.min(edition.total, edition.remaining + bought.quantity)
        touched.add(nft)
      }
      order.status = 'refused'
      order.refusalReason = 'A carteira recusou o pagamento simulado.'
    } else {
      const cart = state.carts.find((item) => item.ownerId === order.userId)
      if (cart) {
        for (const bought of order.items) {
          const line = cart.lines.find((item) => item.nftId === bought.nftId && item.editionId === bought.editionId)
          if (!line) {
            continue
          }
          if (line.quantity <= bought.quantity) {
            cart.lines = cart.lines.filter((item) => item.id !== line.id)
          } else {
            line.quantity -= bought.quantity
          }
        }
        if (cart.lines.length === 0) {
          cart.couponCode = null
        }
      }
      order.status = 'confirmed'
      order.transactionRef = `gm_tx_${crypto.randomUUID().replaceAll('-', '')}`
    }

    order.version += 1
    order.updatedAt = new Date().toISOString()
    nftEvents.push(...eventsFor(touched))
    orderEvent = orderUpdatedEvent(order)
    return state
  })

  for (const event of nftEvents) {
    emitNftUpdated(event)
  }
  if (orderEvent) {
    emitOrderUpdated(orderEvent)
  }
}

export async function placeOrder(user: MockUser, key: string, body: CreateOrderRequest, scenario: MockScenario) {
  const fingerprint = orderFingerprint(body)
  const nftEvents: NftUpdatedEvent[] = []
  let response: Response | null = null
  let createdId: string | null = null

  await updateSimulation((state) => {
    const existing = state.orders.find((order) => order.userId === user.id && order.idempotencyKey === key)
    if (existing) {
      response =
        existing.fingerprint === fingerprint
          ? Response.json(presentOrder(existing))
          : simulationError(409, 'idempotency_conflict', 'Essa tentativa já foi usada com outros dados.')
      return state
    }

    if (state.orders.some((order) => order.userId === user.id && order.status === 'pending')) {
      response = simulationError(
        409,
        'order_pending',
        'Já existe um pagamento em processamento. Aguarde a conclusão antes de criar outro.',
      )
      return state
    }

    const cart = state.carts.find((item) => item.ownerId === user.id) ?? null
    if (scenario === 'price-changed' && cart?.lines[0]) {
      const line = cart.lines[0]
      const nft = state.nfts.find((item) => item.id === line.nftId)
      const edition = nft?.editions.find((item) => item.id === line.editionId)
      const acknowledged = body.quote.items.find((item) => item.lineId === line.id)
      if (nft && edition && acknowledged && acknowledged.unitPriceEth === edition.priceEth) {
        edition.priceEth = addEth(edition.priceEth, '0.05')
        nft.version = (nft.version ?? 1) + 1
        nftEvents.push(nftUpdatedEvent(nft))
        response = simulationError(409, 'quote_stale', 'A cotação mudou. Revise os valores antes de confirmar.')
        return state
      }
    }

    if (!cart || cart.lines.length === 0) {
      response = simulationError(422, 'validation_error', 'O carrinho está vazio.')
      return state
    }

    const view = presentCart(state, cart)
    const quote = quoteCart(state, cart)
    const fresh = {
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      couponCode: quote.coupon?.code ?? null,
      items: view.items.map((item) => ({
        lineId: item.id,
        nftId: item.nftId,
        editionId: item.editionId,
        unitPriceEth: item.unitPriceEth,
        quantity: item.quantity,
      })),
    }

    if (quote.issues.length > 0) {
      response = simulationError(409, 'availability_conflict', 'A disponibilidade mudou. Ajuste o carrinho antes de pagar.')
      return state
    }

    if (quoteFingerprint(fresh) !== quoteFingerprint(body.quote)) {
      response = simulationError(409, 'quote_stale', 'A cotação mudou. Revise os valores antes de confirmar.')
      return state
    }

    const wallet = state.wallets.find((item) => item.id === body.walletId && item.userId === user.id)
    if (!wallet) {
      response = simulationError(422, 'validation_error', 'Escolha uma carteira da sua conta.', {
        walletId: 'Carteira não encontrada.',
      })
      return state
    }

    if (wallet.connectedNetwork !== body.network) {
      response = simulationError(422, 'wallet_disconnected', 'Conecte a carteira à rede escolhida.', {
        walletId: 'A carteira não está conectada a essa rede.',
      })
      return state
    }

    if (body.collector) {
      const fields = validateCheckoutCollector(body.collector)
      if (Object.keys(fields).length) {
        response = simulationError(422, 'validation_error', 'Revise os dados do colecionador.', fields)
        return state
      }
    }

    const name = body.buyerName.trim()
    if (name.length < 2) {
      response = simulationError(422, 'validation_error', 'Revise o nome do colecionador.', {
        buyerName: 'Informe o nome com pelo menos 2 caracteres.',
      })
      return state
    }

    const touched = new Set<CatalogNftRecord>()
    for (const item of fresh.items) {
      const nft = state.nfts.find((entry) => entry.id === item.nftId)
      const edition = nft?.editions.find((entry) => entry.id === item.editionId)
      if (!nft || !edition || item.quantity > edition.remaining) {
        response = simulationError(409, 'availability_conflict', 'A disponibilidade mudou. Ajuste o carrinho antes de pagar.')
        return state
      }
    }

    for (const item of fresh.items) {
      const nft = state.nfts.find((entry) => entry.id === item.nftId)
      const edition = nft?.editions.find((entry) => entry.id === item.editionId)
      if (!nft || !edition) {
        continue
      }
      edition.remaining -= item.quantity
      touched.add(nft)
    }

    const now = new Date().toISOString()
    const order: MockOrder = {
      id: `ord_${crypto.randomUUID()}`,
      userId: user.id,
      status: 'pending',
      idempotencyKey: key,
      fingerprint,
      version: 1,
      createdAt: now,
      updatedAt: now,
      collector: body.collector,
      buyerName: name,
      buyerEmail: user.email,
      walletId: wallet.id,
      walletLabel: wallet.label,
      walletAddress: wallet.address,
      networkId: body.network,
      networkName: networkName(body.network),
      subtotalEth: fresh.subtotalEth,
      discountEth: fresh.discountEth,
      networkFeeEth: fresh.networkFeeEth,
      totalEth: fresh.totalEth,
      couponCode: fresh.couponCode,
      couponPercent: quote.coupon?.percent ?? null,
      items: view.items.map((item) => ({
        nftId: item.nftId,
        editionId: item.editionId,
        title: item.title,
        artist: item.artist,
        editionName: item.editionName,
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt,
        unitPriceEth: item.unitPriceEth,
        quantity: item.quantity,
        lineTotalEth: item.lineTotalEth,
      })),
      transactionRef: null,
      refusalReason: null,
    }

    state.orders.push(order)
    nftEvents.push(...eventsFor(touched))
    createdId = order.id
    response = Response.json(presentOrder(order), { status: 201 })
    return state
  })

  for (const event of nftEvents) {
    emitNftUpdated(event)
  }

  if (createdId) {
    const orderId = createdId
    if (scenario === 'payment-refused') {
      window.setTimeout(() => {
        void settleOrder(orderId, 'refused')
      }, 700)
    } else if (scenario !== 'payment-hold') {
      window.setTimeout(() => {
        void settleOrder(orderId, 'confirmed')
      }, scenario === 'payment-timeout' ? 3500 : 700)
    }

    if (scenario === 'payment-timeout') {
      await delay(8000)
      await updateSimulation((state) => {
        const order = state.orders.find((item) => item.id === orderId)
        if (order) {
          response = Response.json(presentOrder(order))
        }
        return state
      })
    }
  }

  return response ?? simulationError(500, 'unexpected', 'Não foi possível criar o pedido.')
}
