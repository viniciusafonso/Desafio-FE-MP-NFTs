import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SessionMenu } from '@/features/account/session-menu'

type RouteShellProps = {
  children: ReactNode
}

const linkClassName =
  'rounded-md text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function RouteShell({ children }: RouteShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname === '/register' || pathname === '/login') {
    return <div className="min-h-svh">{children}</div>
  }

  if (
    pathname === '/' ||
    pathname.startsWith('/nfts/') ||
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname.startsWith('/orders/') ||
    pathname === '/profile' ||
    pathname === '/wallets'
  ) {
    return <div className="kurio-home min-h-svh">{children}</div>
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Ir para o conteúdo
      </a>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">Kurio</p>
            <SessionMenu />
          </div>
          <nav aria-label="Rotas temporárias da fundação">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              <li>
                <Link to="/" className={linkClassName}>
                  Início
                </Link>
              </li>
              <li>
                <Link to="/nfts/$nftId" params={{ nftId: 'nft_folha_de_vidro' }} className={linkClassName}>
                  Detalhe
                </Link>
              </li>
              <li>
                <Link to="/cart" className={linkClassName}>
                  Carrinho
                </Link>
              </li>
              <li>
                <Link to="/checkout" className={linkClassName}>
                  Pagamento
                </Link>
              </li>
              <li>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: 'exemplo' }}
                  className={linkClassName}
                >
                  Confirmação
                </Link>
              </li>
              <li>
                <Link to="/login" className={linkClassName}>
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className={linkClassName}>
                  Cadastro
                </Link>
              </li>
              <li>
                <Link to="/profile" className={linkClassName}>
                  Perfil
                </Link>
              </li>
              <li>
                <Link to="/wallets" className={linkClassName}>
                  Carteiras
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <div id="conteudo">{children}</div>
    </div>
  )
}
