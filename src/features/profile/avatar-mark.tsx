import type { SVGProps } from 'react'
import { cn } from 'cn'
import { isAvatarId, type AvatarId } from '@/api/contracts/profile'

type AvatarMarkProps = {
  avatarId: string | null
  name: string
  className?: string
}

export function AvatarMark({ avatarId, name, className }: AvatarMarkProps) {
  const preset = isAvatarId(avatarId) ? avatarId : null
  const initial = name.trim().charAt(0).toUpperCase() || 'G'

  return (
    <span
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium',
        className,
      )}
      data-avatar-id={preset ?? 'none'}
    >
      {preset ? <AvatarShape id={preset} /> : <span aria-hidden="true">{initial}</span>}
      <span className="sr-only">{preset ? `Marca ${preset}` : `Inicial de ${name}`}</span>
    </span>
  )
}

function AvatarShape({ id }: { id: AvatarId }) {
  const shared: SVGProps<SVGSVGElement> = {
    viewBox: '0 0 32 32',
    className: 'size-7',
    'aria-hidden': true,
  }

  if (id === 'folha') {
    return (
      <svg {...shared}>
        <path d="M16 4c6 4 9 9 8 16-5 1-10-1-14-5 4 1 7-1 8-4-5 2-8 6-8 11-4-3-6-8-4-14 3 2 6 2 10-4Z" fill="currentColor" />
      </svg>
    )
  }

  if (id === 'musgo') {
    return (
      <svg {...shared}>
        <circle cx="10" cy="12" r="3" fill="currentColor" />
        <circle cx="18" cy="9" r="2" fill="currentColor" />
        <circle cx="22" cy="16" r="3.5" fill="currentColor" />
        <circle cx="13" cy="20" r="2.5" fill="currentColor" />
      </svg>
    )
  }

  if (id === 'dossel') {
    return (
      <svg {...shared}>
        <path d="M4 22c4-10 8-14 12-14s8 4 12 14" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16 8v16" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (id === 'orvalho') {
    return (
      <svg {...shared}>
        <path d="M16 5c5 7 8 10 8 14a8 8 0 1 1-16 0c0-4 3-7 8-14Z" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg {...shared}>
      <path d="M18 6a10 10 0 1 0 8 14 8 8 0 1 1-8-14Z" fill="currentColor" />
    </svg>
  )
}
