import type { AddCartItemRequest, ApplyCouponRequest, CartQuote, CartView, UpdateCartItemRequest } from '@/api/contracts/cart'
import { http } from '@/api/http'

export async function getCart(signal?: AbortSignal) {
  const response = await http.get<CartView>('/cart', { signal })
  return response.data
}

export async function quoteCart(signal?: AbortSignal) {
  const response = await http.post<CartQuote>('/quote', {}, { signal })
  return response.data
}

export async function adoptGuestCart() {
  const response = await http.post<CartView>('/cart/adopt')
  return response.data
}

export async function addCartItem(item: AddCartItemRequest) {
  const response = await http.post<CartView>('/cart/items', item)
  return response.data
}

export async function updateCartItem(lineId: string, item: UpdateCartItemRequest) {
  const response = await http.patch<CartView>(`/cart/items/${lineId}`, item)
  return response.data
}

export async function removeCartItem(lineId: string) {
  const response = await http.delete<CartView>(`/cart/items/${lineId}`)
  return response.data
}

export async function applyCoupon(item: ApplyCouponRequest) {
  const response = await http.put<CartView>('/cart/coupon', item)
  return response.data
}

export async function removeCoupon() {
  const response = await http.delete<CartView>('/cart/coupon')
  return response.data
}
