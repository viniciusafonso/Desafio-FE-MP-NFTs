import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import type { NftDetail } from '@/api/contracts/catalog'
import { isApiRequestError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { AddToCartButton } from '@/features/cart/add-to-cart-button'
import { FavoriteButton } from '@/features/catalog/favorite-button'
import { nftQueryOptions } from '@/features/catalog/queries'
import { NftDetailSkeleton } from '@/features/catalog/catalog-skeleton'
import { MobileBackButton, MobileNavIcon } from '@/features/home/mobile-chrome'
import { useDesktopAuth } from '@/features/account/use-desktop-auth'

const DesktopNftDetail = lazy(() => import('@/features/catalog/nft-detail-desktop'))

type NftDetailPageProps = {
  nftId: string
}

export function NftDetailPage({ nftId }: NftDetailPageProps) {
  const desktop = useDesktopAuth()
  const query = useQuery(nftQueryOptions(nftId))

  if (query.isPending) {
    return <NftDetailSkeleton />
  }

  if (query.isError || !query.data) {
    const message = isApiRequestError(query.error) ? query.error.message : 'Não foi possível abrir o NFT.'
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-10">
        <h1 className="text-[28px] leading-[37px] font-bold">Não foi possível abrir o NFT</h1>
        <p role="alert">{message}</p>
        <Button type="button" className="w-fit" onClick={() => void query.refetch()}>
          Tentar de novo
        </Button>
      </main>
    )
  }

  return desktop ? (
    <Suspense fallback={<NftDetailSkeleton />}><DesktopNftDetail nft={query.data} /></Suspense>
  ) : <MobileDetail key={query.data.id} nft={query.data} />
}

function MobileDetail({ nft }: { nft: NftDetail }) {
  const first =
    nft.editions.find((edition) => edition.name === '1/50' && edition.remaining > 0) ??
    nft.editions.find((edition) => edition.remaining > 0) ??
    null
  const [editionId, setEditionId] = useState(first?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const edition = nft.editions.find((item) => item.id === editionId) ?? null
  const max = edition?.remaining ?? 0
  const nextQuantity = !edition || edition.remaining === 0 ? 0 : Math.min(Math.max(quantity, 1), max)
  const token = tokenId(nft.title)

  return (
    <main className="relative mx-auto min-h-[896px] w-full max-w-[414px] overflow-hidden rounded-[40px] bg-[var(--kurio-ink)]">
      <div className="relative h-[506px] bg-[linear-gradient(143.28deg,#241612_-12%,#2F1D15_106.59%)] px-7 pt-[23px]">
        <div className="flex h-[35px] items-center justify-between">
          <MobileBackButton to="/" />
          <FavoriteButton nftId={nft.id} heart iconOnly subtle />
        </div>
        <img
          src={nft.imageUrl}
          alt={nft.imageAlt}
          width={361}
          height={356}
          fetchPriority="high"
          className="mt-2 h-[356px] w-full rounded-[24px] object-cover"
        />
      </div>
      <section className="absolute inset-x-0 top-[392px] bottom-0 rounded-t-[31px] bg-[var(--kurio-card)] px-6 pt-8 shadow-[0_-14px_30px_rgba(10,6,4,.45)]">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[20px] leading-7 font-bold">{nft.title}</h1>
          {nft.reviewCount ? (
            <p className="flex h-[27px] shrink-0 items-center gap-1 rounded-full border border-[var(--kurio-primary)] px-1 text-[14px] leading-4">
              <svg viewBox="0 0 14 14" className="size-[14px] text-[#e3a44e]" aria-hidden="true"><path fill="currentColor" d="m7 1 1.8 3.7 4.1.6-3 2.9.7 4.1L7 10.4l-3.6 1.9.7-4.1-3-2.9 4.1-.6Z" /></svg>
              <span className="font-medium text-[var(--kurio-fg)]">4.8</span>
              <span className="text-[var(--kurio-secondary)]">({nft.reviewCount})</span>
            </p>
          ) : null}
        </div>
        <p className="mt-3 line-clamp-3 text-[14px] leading-6 text-[var(--kurio-secondary)]">{nft.description.replace('finalizado à mão', `${edition?.name ?? ''} finalizado à mão`).split(', com arte')[0] + '.'}</p>
        <div className="mt-3" data-selected-edition={edition?.id ?? ''}>
          <h2 className="text-[14px] font-bold">Edição:</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Edição">
            {nft.editions.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === edition?.id}
                disabled={item.remaining === 0}
                className={
                  item.id === edition?.id
                    ? 'h-[30px] rounded-full border border-[var(--kurio-primary)] px-3 text-[13px] text-[var(--kurio-accent)]'
                    : 'h-[30px] rounded-full border border-[var(--kurio-border-soft)] px-3 text-[13px] text-[var(--kurio-secondary)] disabled:opacity-40'
                }
                onClick={() => {
                  setEditionId(item.id)
                  setQuantity(1)
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-3 text-[15px] leading-5 text-[var(--kurio-secondary)]">
          {token ? <p>ID do token: {token}</p> : null}
          {nft.collection ? <p>Coleção: {nft.collection}</p> : null}
          {nft.attributes && nft.attributes.length > 0 ? <p>Atributos: {nft.attributes.join(', ')}</p> : null}
        </div>
      </section>
      <section className="absolute inset-x-0 bottom-0 h-[164px] rounded-t-[40px] bg-[var(--kurio-card)] px-6 pt-5 pb-9 shadow-[0_-12px_28px_rgba(10,6,4,.32)]">
        <div className="flex h-[30px] items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]">
            <span>Qtd.</span>
            <button type="button" className="h-[30px] w-5 rounded-full bg-[var(--kurio-primary)] text-[var(--kurio-ink)] disabled:opacity-40" aria-label="Diminuir quantidade" disabled={nextQuantity <= 1} onClick={() => setQuantity(nextQuantity - 1)}>−</button>
            <span>{nextQuantity}</span>
            <button type="button" className="h-[30px] w-5 rounded-full bg-[var(--kurio-primary)] text-[var(--kurio-ink)] disabled:opacity-40" aria-label="Aumentar quantidade" disabled={!edition || nextQuantity >= max} onClick={() => setQuantity(nextQuantity + 1)}>+</button>
          </div>
          <p className="text-[20px] font-bold text-[var(--kurio-accent)]">{edition?.priceEth ?? nft.priceEth} ETH</p>
        </div>
        <div className="mt-5 flex items-start gap-3">
          {edition ? (
            <AddToCartButton nftId={nft.id} editionId={edition.id} quantity={nextQuantity} disabled={nextQuantity === 0} appearance="kurio" feedback="accessible" label="Comprar NFT" className="h-[60px] w-[196px] rounded-[30px] text-base font-bold disabled:opacity-50" />
          ) : null}
          <Link to="/cart" aria-label="Carrinho" className="flex size-[60px] shrink-0 items-center justify-center rounded-full border border-[var(--kurio-border)] bg-[var(--kurio-raised,#2f1d15)] text-[var(--kurio-muted)]">
            <MobileNavIcon kind="cart" />
          </Link>
        </div>
      </section>
    </main>
  )
}

function tokenId(title: string) {
  const match = title.match(/#(\d+)/)
  if (!match) {
    return null
  }
  return `#${match[1].padStart(4, '0')}`
}
