import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { UserRound, MapPin, ShoppingCart, Heart, ChartNoAxesCombined, Download, TriangleAlert, LogOut } from 'lucide-react'
import { cn } from 'cn'
import { signOut } from '@/features/account/session'

const links = [
  { to: '/profile' as const, label: 'Dados do perfil' },
  { to: '/wallets' as const, label: 'Carteiras' },
]

const unavailable = ['Atividade', 'Lista de interesse', 'Ofertas', 'Arquivos baixados', 'Suporte']

export function AccountNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)
  const logout = useMutation({
    mutationFn: () => signOut(queryClient),
    onSuccess: async () => {
      await navigate({ to: '/' })
    },
  })

  return (
    <nav aria-label="Conta" className="flex w-full flex-col bg-[var(--kurio-card)] lg:w-[310px] lg:shrink-0">
      <h2 className="px-4 py-3.5 text-[18px] leading-4 font-bold">Meu perfil</h2>
      {links.map((item) => {
        const current = pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex h-[45px] items-center gap-4 border-l-[6px] px-3 text-[15px] leading-5',
              current ? 'border-[var(--kurio-primary)] font-bold text-[var(--kurio-accent)]' : 'border-transparent text-[var(--kurio-accent)]',
            )}
          >
            {item.to === '/profile' ? <UserRound className="size-4" /> : <MapPin className="size-4" />}{item.label}
          </Link>
        )
      })}
      {unavailable.map((label) => (
        <button
          key={label}
          type="button"
          className="flex h-[45px] items-center gap-4 px-[18px] text-left text-[15px] leading-5 text-[var(--kurio-accent)]"
          onClick={() => setNotice(`${label} não conclui uma ação nesta simulação.`)}
        >
          {label === 'Atividade' ? <ShoppingCart className="size-4" /> : label === 'Lista de interesse' ? <Heart className="size-4" /> : label === 'Ofertas' ? <ChartNoAxesCombined className="size-4" /> : label === 'Suporte' ? <TriangleAlert className="size-4" /> : <Download className="size-4" />}{label}
        </button>
      ))}
      <button
        type="button"
        className="flex h-[49px] items-center gap-4 border-t border-[var(--kurio-border-soft)] px-[18px] text-left text-[15px] leading-5 text-[var(--kurio-accent)]"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOut className="size-4" />{logout.isPending ? 'Saindo…' : 'Sair'}
      </button>
      {notice ? (
        <p role="status" className="px-3 text-sm leading-5 text-[var(--kurio-secondary)]">
          {notice}
        </p>
      ) : null}
    </nav>
  )
}

export function AccountFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-7 lg:flex-row lg:items-start">
      <AccountNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
