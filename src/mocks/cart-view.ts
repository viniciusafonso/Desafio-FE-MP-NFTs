import type { CartLine, CartQuote, CartView } from '@/api/contracts/cart'
import { addEth, multiplyEth, percentOfEth, subtractEth } from '@/api/contracts/money'
import { coverOf } from '@/mocks/catalog-view'
import { couponFixtures, networkFeeEth } from '@/mocks/fixtures/coupons'
import type { MockCart, MockState } from '@/mocks/db'

function heldQuantity(state: MockState, ownerId: string | null, editionId: string) {
  if (!ownerId || ownerId.startsWith('gst_')) {
    return 0
  }

  let held = 0
  for (const order of state.orders) {
    if (order.userId !== ownerId || order.status !== 'pending') {
      continue
    }

    for (const item of order.items) {
      if (item.editionId === editionId) {
        held += item.quantity
      }
    }
  }

  return held
}

export function sellableQuantity(state: MockState, ownerId: string | null, editionId: string, remaining: number) {
  return remaining + heldQuantity(state, ownerId, editionId)
}

export function emptyQuote(): CartQuote {
  return {
    subtotalEth: '0',
    discountEth: '0',
    networkFeeEth: '0',
    totalEth: '0',
    coupon: null,
    issues: [],
  }
}

export function findCoupon(code: string | null) {
  if (!code) {
    return null
  }

  return couponFixtures.find((coupon) => coupon.code === code) ?? null
}

export function quoteCart(state: MockState, cart: MockCart | null, now = Date.now()): CartQuote {
  if (!cart || cart.lines.length === 0) {
    return emptyQuote()
  }

  const issues: CartQuote['issues'] = []
  let subtotalEth = '0'

  for (const line of cart.lines) {
    const nft = state.nfts.find((item) => item.id === line.nftId)
    const edition = nft?.editions.find((item) => item.id === line.editionId)
    if (!nft || !edition) {
      issues.push({
        lineId: line.id,
        code: 'unavailable',
        message: 'Essa edição não está mais disponível.',
      })
      continue
    }

    const available = sellableQuantity(state, cart.ownerId, edition.id, edition.remaining)
    if (line.quantity > available) {
      issues.push({
        lineId: line.id,
        code: 'insufficient_stock',
        message: `Há ${available} unidade(s) disponível(is) de ${nft.title}.`,
      })
    }

    subtotalEth = addEth(subtotalEth, multiplyEth(edition.priceEth, line.quantity))
  }

  const coupon = findCoupon(cart.couponCode)
  const activeCoupon = coupon && Date.parse(coupon.expiresAt) > now ? coupon : null
  const discountEth = activeCoupon ? percentOfEth(subtotalEth, activeCoupon.percent) : '0'
  const networkFee = networkFeeEth
  const totalEth = addEth(subtractEth(subtotalEth, discountEth), networkFee)

  return {
    subtotalEth,
    discountEth,
    networkFeeEth: networkFee,
    totalEth,
    coupon: activeCoupon ? { code: activeCoupon.code, percent: activeCoupon.percent } : null,
    issues,
  }
}

export function presentCart(state: MockState, cart: MockCart | null): CartView {
  const items: CartLine[] = []

  for (const line of cart?.lines ?? []) {
    const nft = state.nfts.find((item) => item.id === line.nftId)
    const edition = nft?.editions.find((item) => item.id === line.editionId)
    if (!nft || !edition) {
      continue
    }

    const cover = coverOf(nft)
    items.push({
      id: line.id,
      nftId: nft.id,
      editionId: edition.id,
      title: nft.title,
      artist: nft.artist,
      editionName: edition.name,
      imageUrl: cover.imageUrl,
      imageAlt: cover.imageAlt,
      unitPriceEth: edition.priceEth,
      quantity: line.quantity,
      lineTotalEth: multiplyEth(edition.priceEth, line.quantity),
      available: sellableQuantity(state, cart?.ownerId ?? null, edition.id, edition.remaining),
    })
  }

  return {
    items,
    couponCode: cart?.couponCode ?? null,
  }
}

export function ensureCart(state: MockState, ownerId: string): MockCart {
  const existing = state.carts.find((cart) => cart.ownerId === ownerId)
  if (existing) {
    return existing
  }

  const created: MockCart = { ownerId, lines: [], couponCode: null }
  state.carts.push(created)
  return created
}
