import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthStage } from '@/features/account/auth-stage'
import { useDesktopAuth } from '@/features/account/use-desktop-auth'
import { RegisterForm } from '@/features/account/register-form'
import { readSessionToken } from '@/api/session-storage'

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//') ? search.redirect : undefined }),
  beforeLoad: ({ search }) => {
    if (readSessionToken()) {
      throw redirect({ href: search.redirect ?? '/' })
    }
  },
  head: () => ({
    meta: [{ title: 'Cadastro · Kurio' }],
  }),
  component: RegisterRoute,
})

function RegisterRoute() {
  const desktop = useDesktopAuth()
  const search = Route.useSearch()

  if (desktop) {
    return (
      <AuthStage mode="register" redirectTo={search.redirect}>
        <RegisterForm surface="dialog" redirectTo={search.redirect} />
      </AuthStage>
    )
  }

  return (
    <div className="kurio-auth">
      <RegisterForm redirectTo={search.redirect} />
    </div>
  )
}
