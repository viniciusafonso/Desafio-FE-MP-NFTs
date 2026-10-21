import { Link, useRouterState } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from 'cn'

export function PhonePage({ title, backTo, children }: { title: string; backTo: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[896px] w-full max-w-[414px] flex-col rounded-[40px] bg-[var(--kurio-ink)] px-7 pt-8 pb-8">
      <div className="mb-5 flex h-11 items-center gap-3">
        <MobileBackButton to={backTo} />
        <h1 className="flex-1 text-center text-base font-bold">{title}</h1>
        <span className="size-11" aria-hidden="true" />
      </div>
      {children}
    </main>
  )
}

export function MobileTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[126px] w-full max-w-[414px] items-end justify-around px-5 pb-[21px] lg:hidden"
    >
      <svg aria-hidden="true" viewBox="0 0 414 126" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full drop-shadow-[0_-10px_15px_rgba(10,6,4,.45)]">
        <path fill="var(--kurio-card)" d="M0 63Q0 31 32 31H156C165 31 168 80 207 80S249 31 258 31H382Q414 31 414 63V126H0Z" />
      </svg>
      <TabLink to="/" label="Início" current={pathname === '/'} icon={<MobileNavIcon kind="home" />} />
      <Link
        to="/"
        search={{ favorites: true }}
        aria-label="Favoritos"
        className="relative flex size-11 items-center justify-center text-[var(--kurio-secondary)]"
      >
        <Heart fill="currentColor" className="size-6" aria-hidden="true" />
      </Link>
      <Link
        to="/wallets"
        aria-label="Carteiras"
        className="relative -translate-y-[40px] flex size-[65px] items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(210,138,76,.4)_-16.92%,#d28a4c_109.23%)] text-[var(--kurio-fg)]"
      >
        <MobileNavIcon kind="wallet" />
      </Link>
      <TabLink to="/cart" label="Carrinho" current={pathname === '/cart'} icon={<MobileNavIcon kind="cart" />} />
      <TabLink to="/profile" label="Perfil" current={pathname === '/profile'} icon={<MobileNavIcon kind="user" />} />
    </nav>
  )
}

function TabLink({
  to,
  label,
  current,
  icon,
}: {
  to: '/' | '/cart' | '/profile'
  label: string
  current: boolean
  icon: ReactNode
}) {
  return (
    <Link
      to={to}
      aria-current={current ? 'page' : undefined}
      aria-label={label}
      className={cn(
        'relative flex size-11 items-center justify-center [&_svg]:size-5',
        current ? 'text-[var(--kurio-accent)]' : 'text-[var(--kurio-secondary)]',
      )}
    >
      {icon}
    </Link>
  )
}

/** Mobile silhouettes and curved filter follow the mobile Figma frame. */
export function MobileNavIcon({ kind }: { kind: 'home' | 'cart' | 'user' | 'wallet' | 'filter' | 'back' | 'delete' }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={kind === 'wallet' ? 'h-[30px] w-[27px]' : kind === 'back' ? 'size-5' : 'size-[22px]'}>
    {kind === 'delete' && <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5.6 9.6 6.3 19c.1 1.5 1 2.2 2.6 2.2h6.2c1.6 0 2.5-.7 2.6-2.2l.7-9.4M4.2 6h16M8.8 6l.5-2.3c.2-.8.7-1 1.5-1h2.4c.8 0 1.3.2 1.5 1l.5 2.3" /></g>}
    {kind === 'back'  && <path d="M14.5 5 7.5 12l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
    {kind === 'home' && <path fill="currentColor" d="M3 9.7a3 3 0 0 1 1.1-2.3l6-4.8a3 3 0 0 1 3.8 0l6 4.8A3 3 0 0 1 21 9.7V19a3 3 0 0 1-3 3h-3.5v-6a2.5 2.5 0 0 0-5 0v6H6a3 3 0 0 1-3-3Z" />}
    {kind === 'user' && <path fill="currentColor" d="M12 2a4.3 4.3 0 1 0 0 8.6A4.3 4.3 0 0 0 12 2Zm0 11c-5.2 0-8 2.7-8 6.2C4 21.3 7.6 22 12 22s8-.7 8-2.8c0-3.5-2.8-6.2-8-6.2Z" />}
    {kind === 'cart' && <path fill="currentColor" d="M2 3h2.7l1 3H21l-2 10H7L3.5 5H2V3Zm6 14.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm10 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z" />}
    {kind === 'wallet' && <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9.5C2.4 3.1 4.2 2.2 10 1.8M14 1.8C19.8 2.2 21.6 3.1 22 9.5M2 14.5C2.4 20.9 4.2 21.8 10 22.2M14 22.2C19.8 21.8 21.6 20.9 22 14.5M.8 12H23.2" /></g>}
    {kind === 'filter' && <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="4.5" width="5" height="5" rx="1.7" /><path d="M14 7h6M4.5 17h6" /><rect x="15" y="14" width="5" height="6" rx="1.7" /></g>}
  </svg>
}

export function MobileBackButton({ to, onClick }: { to?: string; onClick?: () => void }) {
  const className = 'flex size-[35px] shrink-0 items-center justify-center rounded-full border border-[var(--kurio-border)] bg-[#2f1d15] text-[var(--kurio-muted)]'
  return to ? <Link to={to} aria-label="Voltar" className={className}><MobileNavIcon kind="back" /></Link>
    : <button type="button" aria-label="Voltar" className={className} onClick={onClick}><MobileNavIcon kind="back" /></button>
}
