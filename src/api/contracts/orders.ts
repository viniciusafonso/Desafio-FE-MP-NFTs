import type { PaymentNetwork } from '@/api/contracts/wallets'

export type OrderStatus = 'pending' | 'confirmed' | 'refused'

export type OrderItem = {
  nftId: string
  editionId: string
  title: string
  artist: string
  editionName: string
  imageUrl: string
  imageAlt: string
  unitPriceEth: string
  quantity: number
  lineTotalEth: string
}

export type QuoteAcknowledgement = {
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  items: Array<{
    lineId: string
    nftId: string
    editionId: string
    unitPriceEth: string
    quantity: number
  }>
}

export type CreateOrderRequest = {
  collector?: Record<string, string>
  buyerName: string
  walletId: string
  network: PaymentNetwork
  quote: QuoteAcknowledgement
}

export type OrderReceipt = {
  id: string
  userId: string
  status: OrderStatus
  version: number
  createdAt: string
  updatedAt: string
  collector?: Record<string, string>
  buyerName: string
  buyerEmail: string
  walletId: string
  walletLabel: string
  walletAddress: string
  networkId: PaymentNetwork
  networkName: string
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  couponPercent: number | null
  items: OrderItem[]
  transactionRef: string | null
  refusalReason: string | null
}

export function quoteFingerprint(quote: QuoteAcknowledgement) {
  const items = [...quote.items]
    .map((item) => ({
      lineId: item.lineId,
      nftId: item.nftId,
      editionId: item.editionId,
      unitPriceEth: item.unitPriceEth,
      quantity: item.quantity,
    }))
    .sort((left, right) => left.lineId.localeCompare(right.lineId))

  return JSON.stringify({
    subtotalEth: quote.subtotalEth,
    discountEth: quote.discountEth,
    networkFeeEth: quote.networkFeeEth,
    totalEth: quote.totalEth,
    couponCode: quote.couponCode,
    items,
  })
}

export function orderFingerprint(input: CreateOrderRequest) {
  return JSON.stringify({
    collector: input.collector ?? {},
    buyerName: input.buyerName.trim(),
    walletId: input.walletId,
    network: input.network,
    quote: quoteFingerprint(input.quote),
  })
}
