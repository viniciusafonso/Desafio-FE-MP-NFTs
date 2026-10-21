import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/features/account/require-session'
import { ProfilePage } from '@/features/profile/profile-page'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ location }) => {
    requireSession(`${location.pathname}${location.searchStr}`)
  },
  head: () => ({
    meta: [{ title: 'Perfil · Kurio' }],
  }),
  component: ProfilePage,
})
