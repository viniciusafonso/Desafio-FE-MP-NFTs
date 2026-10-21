import { cn } from '@/lib/utils'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { isApiRequestError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { useToggleFavorite } from '@/features/catalog/use-favorites'

type FavoriteButtonProps = {
  nftId: string
  className?: string
  heart?: boolean
  iconOnly?: boolean
  subtle?: boolean
}

export function FavoriteButton({ nftId, className, heart = false, iconOnly = false, subtle = false }: FavoriteButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, saved, ready, mutation } = useToggleFavorite(nftId)
  const returnTo = `${location.pathname}${location.searchStr}`
  const errorMessage = mutation.isError
    ? isApiRequestError(mutation.error)
      ? mutation.error.message
      : 'Não foi possível atualizar os favoritos.'
    : null

  const kurioClass = iconOnly && subtle
    ? 'inline-flex size-[35px] items-center justify-center rounded-full border border-[var(--kurio-border)] bg-[var(--kurio-raised,#2f1d15)] text-[var(--kurio-accent)] disabled:opacity-50'
    : iconOnly
    ? 'inline-flex size-9 items-center justify-center rounded-full border border-[var(--kurio-primary)] bg-[var(--kurio-card)]/90 text-[var(--kurio-accent)] shadow-[0_4px_12px_rgba(10,6,4,.35)] disabled:opacity-50'
    : 'inline-flex h-10 w-[130px] items-center justify-center gap-2 rounded-[6px] border border-[var(--kurio-primary)] bg-transparent text-sm leading-5 font-medium text-[var(--kurio-accent)] disabled:opacity-50'

  if (heart) {
    const label = session.status === 'authenticated' && saved ? 'Favorito' : 'Favoritar'
    const pending = session.status === 'loading' || (session.status === 'authenticated' && (!ready || mutation.isPending))
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          className={cn(kurioClass, className)}
          aria-label={label}
          aria-pressed={session.status === 'authenticated' ? saved : undefined}
          disabled={pending}
          onClick={() => {
            if (session.status !== 'authenticated') {
              void navigate({ to: '/login', search: { redirect: returnTo } })
              return
            }
            mutation.mutate(saved ? 'remove' : 'add')
          }}
        >
          <HeartIcon filled={saved} />
          {iconOnly ? null : label}
        </button>
        {errorMessage ? (
          <p role="alert" className="text-sm text-[var(--kurio-accent)]">
            {errorMessage}
          </p>
        ) : null}
      </div>
    )
  }

  if (session.status !== 'authenticated') {
    return (
      <Button
        type="button"
        variant="outline"
        className={heart ? kurioClass : (className ?? 'w-fit')}
        disabled={session.status === 'loading'}
        onClick={() => {
          void navigate({ to: '/login', search: { redirect: returnTo } })
        }}
      >
        {heart ? <HeartIcon filled={saved} /> : null}
        Favoritar
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={saved ? 'secondary' : 'outline'}
        className={heart ? kurioClass : (className ?? 'w-fit')}
        aria-pressed={saved}
        disabled={!ready || mutation.isPending}
        onClick={() => {
          mutation.mutate(saved ? 'remove' : 'add')
        }}
      >
        {heart ? <HeartIcon filled={saved} /> : null}
        {saved ? 'Favorito' : 'Favoritar'}
      </Button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <path
        fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.1"
        d="M10 16.7 8.8 15.6C4.9 12.1 2.5 9.9 2.5 7.2 2.5 5 4.2 3.3 6.4 3.3c1.3 0 2.5.6 3.6 1.8 1.1-1.2 2.3-1.8 3.6-1.8 2.2 0 3.9 1.7 3.9 3.9 0 2.7-2.4 4.9-6.3 8.4L10 16.7Z"
      />
    </svg>
  )
}
