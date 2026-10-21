import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/features/account/require-session'
import { WalletsPage } from '@/features/wallets/wallets-page'

export const Route = createFileRoute('/wallets')({
  beforeLoad: ({ location }) => {
    requireSession(`${location.pathname}${location.searchStr}`)
  },
  head: () => ({
    meta: [{ title: 'Carteiras · Kurio' }],
  }),
  component: WalletsPage,
})
