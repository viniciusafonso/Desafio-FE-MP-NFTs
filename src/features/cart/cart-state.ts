import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  adoptGuestCart,
  applyCoupon,
  getCart,
  quoteCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '@/api/cart'
import type { CartView } from '@/api/contracts/cart'
import { isApiRequestError } from '@/api/errors'
import { clearGuestCartId, clearSessionToken, markSessionExpired, readGuestCartId, readSessionToken } from '@/api/session-storage'

export const cartKeys = {
  current: ['cart', 'current'] as const,
  quote: ['cart', 'quote'] as const,
}

export const cartMutationKey = ['cart', 'change'] as const

async function readCart(signal?: AbortSignal) {
  if (readSessionToken() && readGuestCartId()) {
    const cart = await adoptGuestCart()
    clearGuestCartId()
    return cart
  }

  return getCart(signal)
}

export function useCart() {
  return useQuery({
    queryKey: cartKeys.current,
    meta: { scope: 'private' },
    queryFn: async ({ signal }) => {
      try {
        return await readCart(signal)
      } catch (error) {
        if (isApiRequestError(error) && error.status === 401) {
          markSessionExpired()
          clearSessionToken()
        }
        throw error
      }
    },
  })
}

export function useCartQuote(enabled: boolean) {
  return useQuery({
    queryKey: cartKeys.quote,
    meta: { scope: 'private' },
    enabled,
    queryFn: async ({ signal }) => {
      try {
        return await quoteCart(signal)
      } catch (error) {
        if (isApiRequestError(error) && error.status === 401) {
          markSessionExpired()
          clearSessionToken()
        }
        throw error
      }
    },
  })
}

export function storeCart(queryClient: QueryClient, cart: CartView) {
  queryClient.setQueryData(cartKeys.current, cart)
  void queryClient.invalidateQueries({ queryKey: cartKeys.quote })
}

export async function adoptGuestCartIfAny(queryClient: QueryClient) {
  if (!readSessionToken() || !readGuestCartId()) {
    return
  }

  try {
    const cart = await adoptGuestCart()
    clearGuestCartId()
    storeCart(queryClient, cart)
  } catch {
    // A próxima abertura do carrinho tenta de novo.
  }
}

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) => updateCartItem(lineId, { quantity }),
    onMutate: async ({ lineId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.current })
      const previous = queryClient.getQueryData<CartView>(cartKeys.current)
      if (previous) {
        queryClient.setQueryData<CartView>(cartKeys.current, {
          ...previous,
          items: previous.items.map((item) => (item.id === lineId ? { ...item, quantity } : item)),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartKeys.current, context.previous)
      }
    },
    onSuccess: (cart) => {
      storeCart(queryClient, cart)
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: (lineId: string) => removeCartItem(lineId),
    onMutate: async (lineId) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.current })
      const previous = queryClient.getQueryData<CartView>(cartKeys.current)
      if (previous) {
        queryClient.setQueryData<CartView>(cartKeys.current, {
          ...previous,
          items: previous.items.filter((item) => item.id !== lineId),
        })
      }
      return { previous }
    },
    onError: (_error, _lineId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartKeys.current, context.previous)
      }
    },
    onSuccess: (cart) => {
      storeCart(queryClient, cart)
    },
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: (code: string) => applyCoupon({ code }),
    onSuccess: (cart) => {
      storeCart(queryClient, cart)
    },
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: removeCoupon,
    onSuccess: (cart) => {
      storeCart(queryClient, cart)
    },
  })
}
