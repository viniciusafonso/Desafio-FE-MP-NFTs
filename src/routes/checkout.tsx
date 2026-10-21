import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '@/features/checkout/checkout-page'
import { requireSession } from '@/features/account/require-session'

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ location }) => {
    requireSession(`${location.pathname}${location.searchStr}`)
  },
  head: () => ({
    meta: [{ title: 'Pagamento · Kurio' }],
  }),
  component: CheckoutPage,
})
