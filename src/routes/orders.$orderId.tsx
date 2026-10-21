import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/features/account/require-session'
import { OrderPage } from '@/features/orders/order-page'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ location }) => {
    requireSession(`${location.pathname}${location.searchStr}`)
  },
  head: () => ({
    meta: [{ title: 'Pedido · Kurio' }],
  }),
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  return <OrderPage orderId={orderId} />
}
