import { Dialog } from 'radix-ui'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { CatalogPage } from '@/features/catalog/catalog-page'

export function AuthStage({
  mode,
  children, redirectTo,
}: {
  mode: 'login' | 'register'
  children: ReactNode
  redirectTo?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="kurio-home relative h-[1981px] overflow-clip">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" inert>
        <HomeBackdrop />
      </div>
      <div className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto px-4 pt-[160px] pb-12">
        <Dialog.Root open onOpenChange={(open) => { if (!open) void navigate({ to: '/' }) }}><Dialog.Content onOpenAutoFocus={(event) => { event.preventDefault(); document.getElementById(mode === 'login' ? 'login-email' : 'register-name')?.focus() }} className="relative w-full max-w-[500px] min-h-[600px] [&_input]:h-10 [&_input]:rounded-[4px] border-b-[10px] border-[var(--kurio-primary)] bg-[var(--kurio-card)] px-20 pt-12 pb-16 text-[var(--kurio-fg)] [--kurio-action:#d28a4c] [--kurio-action-ink:#130d0a] [--kurio-gold:#b39463] [--kurio-ink:#f5f1ec] [--kurio-line:#3f2319]">
          <Dialog.Title className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</Dialog.Title>
          <Dialog.Description className="sr-only">Acesse sua conta de colecionador para continuar.</Dialog.Description>
          <Link
            to="/"
            aria-label="Fechar"
            className="absolute top-4 right-4 flex size-8 items-center justify-center text-lg text-[var(--kurio-fg)]"
          >
            ×
          </Link>
          <div className="mb-9 flex items-center justify-center gap-1 text-[20px] leading-[26px] font-bold">
            <Link to="/login" search={redirectTo ? { redirect: redirectTo } : {}} className={mode === 'login' ? 'text-[var(--kurio-accent)]' : 'text-[var(--kurio-fg)]'}>
              Entrar
            </Link>
            <span aria-hidden="true">|</span>
            <Link to="/register" search={redirectTo ? { redirect: redirectTo } : {}} className={mode === 'register' ? 'text-[var(--kurio-accent)]' : 'text-[var(--kurio-fg)]'}>
              Criar conta
            </Link>
          </div>
          {children}
        </Dialog.Content></Dialog.Root>
      </div>
    </div>
  )
}

function HomeBackdrop() {
  return <CatalogPage search={{}} backdrop />
}
