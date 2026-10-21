import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthStage } from '@/features/account/auth-stage'
import { useDesktopAuth } from '@/features/account/use-desktop-auth'
import { LoginForm } from '@/features/account/login-form'
import { readSessionToken } from '@/api/session-storage'

type LoginSearch = {
  redirect?: string
  notice?: 'expired'
}

function validateLoginSearch(search: Record<string, unknown>): LoginSearch {
  const redirectTo = typeof search.redirect === 'string' ? search.redirect : undefined
  const safeRedirect =
    redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : undefined

  return {
    redirect: safeRedirect,
    notice: search.notice === 'expired' ? 'expired' : undefined,
  }
}

export const Route = createFileRoute('/login')({
  validateSearch: validateLoginSearch,
  beforeLoad: ({ search }) => {
    if (readSessionToken()) {
      throw redirect({ href: search.redirect ?? '/' })
    }
  },
  head: () => ({
    meta: [{ title: 'Entrar · Kurio' }],
  }),
  component: LoginRoute,
})

function LoginRoute() {
  const search = Route.useSearch()
  const desktop = useDesktopAuth()

  if (desktop) {
    return (
      <AuthStage mode="login" redirectTo={search.redirect}>
        <LoginForm redirectTo={search.redirect} notice={search.notice} surface="dialog" />
      </AuthStage>
    )
  }

  return (
    <div className="kurio-auth">
      <LoginForm redirectTo={search.redirect} notice={search.notice} />
    </div>
  )
}
