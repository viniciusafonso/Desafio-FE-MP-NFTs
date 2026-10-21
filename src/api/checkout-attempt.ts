import { orderFingerprint, type CreateOrderRequest } from '@/api/contracts/orders'

const attemptKey = 'greenmint.order-attempt'

export type OrderAttempt = {
  key: string
  body: CreateOrderRequest
}

export function readOrderAttempt(): OrderAttempt | null {
  const raw = sessionStorage.getItem(attemptKey)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as OrderAttempt
    if (!parsed || typeof parsed.key !== 'string' || !parsed.body) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveOrderAttempt(body: CreateOrderRequest) {
  const current = readOrderAttempt()
  const next: OrderAttempt =
    current && orderFingerprint(current.body) === orderFingerprint(body)
      ? { key: current.key, body }
      : { key: crypto.randomUUID(), body }
  sessionStorage.setItem(attemptKey, JSON.stringify(next))
  return next
}

export function clearOrderAttempt() {
  sessionStorage.removeItem(attemptKey)
}
