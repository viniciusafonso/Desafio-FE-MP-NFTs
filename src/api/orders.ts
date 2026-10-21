import type { CreateOrderRequest, OrderReceipt } from '@/api/contracts/orders'
import { http } from '@/api/http'

export async function createOrder(body: CreateOrderRequest, idempotencyKey: string) {
  const response = await http.post<OrderReceipt>('/orders', body, {
    timeout: 2500,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return response.data
}

export async function getOrder(orderId: string, signal?: AbortSignal) {
  const response = await http.get<OrderReceipt>(`/orders/${orderId}`, { signal })
  return response.data
}
