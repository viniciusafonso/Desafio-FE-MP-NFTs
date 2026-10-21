export type CartLine = {
  id: string
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
  available: number
}

export type CartQuoteIssue = {
  lineId: string
  code: 'insufficient_stock' | 'unavailable'
  message: string
}

export type CartQuote = {
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  coupon: {
    code: string
    percent: number
  } | null
  issues: CartQuoteIssue[]
}

export type CartView = {
  items: CartLine[]
  couponCode: string | null
}

export type AddCartItemRequest = {
  nftId: string
  editionId: string
  quantity: number
}

export type UpdateCartItemRequest = {
  quantity: number
}

export type ApplyCouponRequest = {
  code: string
}
