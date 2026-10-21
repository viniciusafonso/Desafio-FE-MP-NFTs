import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/cart-page'

export const Route = createFileRoute('/cart')({
  head: () => ({
    meta: [
      { title: 'Carrinho · Kurio' },
      { name: 'description', content: 'Carrinho da Kurio, com quantidades, cupom e cotação.' },
    ],
  }),
  component: CartRoute,
})

function CartRoute() {
  return <CartPage />
}
