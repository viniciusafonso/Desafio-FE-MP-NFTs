import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
} from '@tanstack/react-router'
import { PendingScreen } from '@/app/pending-screen'
import { RouteShell } from '@/app/route-shell'
import type { AppRouterContext } from '@/app/router-context'
import { SessionExpirationRedirect } from '@/features/account/session-redirect'

export const Route = createRootRouteWithContext<AppRouterContext>()({
  head: () => ({
    meta: [{ title: 'Kurio' }],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <HeadContent />
      <SessionExpirationRedirect />
      <RouteShell>
        <Outlet />
      </RouteShell>
    </>
  )
}

function NotFound() {
  return (
    <PendingScreen
      title="Página não encontrada"
      description="Esse endereço não corresponde a nenhuma tela do marketplace."
    >
      <Link
        to="/"
        className="w-fit rounded-md text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Voltar ao início
      </Link>
    </PendingScreen>
  )
}
