import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'cn'

export const kurioButtonClass =
  'inline-flex items-center justify-center rounded-[var(--kurio-radius)] bg-[var(--kurio-primary)] text-[var(--kurio-ink)] disabled:opacity-50'

export const kurioFieldClass =
  'h-10 rounded-[var(--kurio-radius)] border-[var(--kurio-border)] bg-transparent text-[var(--kurio-fg)] placeholder:text-[var(--kurio-muted)]'

export const kurioPanelClass = 'rounded-[6px] bg-[var(--kurio-card)] p-4 sm:p-6'

export function KurioButton({ className, type = 'button', ...props }: ComponentProps<'button'>) {
  return <button type={type} className={cn(kurioButtonClass, className)} {...props} />
}

export function FilterRow({
  active = false,
  count,
  children,
}: {
  active?: boolean
  count?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex h-10 items-center justify-between text-[15px] leading-10',
        active ? 'text-[var(--kurio-accent)]' : 'text-[var(--kurio-secondary)]',
      )}
    >
      <span className="flex items-center gap-2.5">{children}</span>
      {count ? <span>{count}</span> : null}
    </div>
  )
}

export const pageButtonClass =
  'flex size-[35px] items-center justify-center rounded-[4px] text-lg leading-4'

export const pageButtonIdleClass = 'border border-[var(--kurio-border)] text-[var(--kurio-fg)]'

export const pageButtonCurrentClass = 'bg-[var(--kurio-primary)] font-bold text-[var(--kurio-ink)]'
