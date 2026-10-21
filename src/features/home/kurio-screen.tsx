import { MobileBackButton } from '@/features/home/mobile-chrome'
import { useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { HomeFooter, HomeHeader } from '@/features/home/home-sections'

export function KurioScreen({
  active,
  children,
  phoneTitle,
  account = false,
}: {
  active: 'inicio' | 'mercado'
  children: ReactNode
  account?: boolean
  phoneTitle?: string
}) {
  const navigate = useNavigate()

  return (
    <div className={`mx-auto flex w-full max-w-[1440px] flex-col px-6 py-6 xl:px-[120px] ${account ? "min-h-[1080px] gap-8" : "gap-8"}`}>
      <div className={phoneTitle ? 'hidden lg:block' : undefined}>
        <HomeHeader
          query=""
          active={active}
          onSearch={(q) => {
            void navigate({ to: '/', search: q ? { q } : {} })
          }}
        />
      </div>
      {phoneTitle ? (
        <div className="flex items-center gap-3 lg:hidden">
          <MobileBackButton onClick={() => void navigate({ to: '/cart' })} />
          <h1 className="flex-1 text-center text-base font-bold">{phoneTitle}</h1>
          <span className="size-8" />
        </div>
      ) : null}
      {children}
      {!account ? <div className="mt-16 hidden lg:block"><HomeFooter /></div> : null}
    </div>
  )
}
