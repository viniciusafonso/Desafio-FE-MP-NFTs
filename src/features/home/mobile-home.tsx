import { nftSlug } from '@/api/contracts/catalog'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { CatalogSearch, NftSummary } from '@/api/contracts/catalog'
import { FavoriteButton } from '@/features/catalog/favorite-button'
import { MobileNavIcon, MobileTabBar } from '@/features/home/mobile-chrome'

import { MobileCatalogSkeleton } from '@/features/catalog/catalog-skeleton'

const MobileCatalogFilters = lazy(() => import('@/features/catalog/mobile-catalog-filters'))

export function MobileHome({
  query,
  search,
  onFilter,
  onSearch,
  items,
  status,
  errorMessage,
  authRequired,
  onRetry, filters, hasNext, onNextPage,
}: {
  query: string
  filters: ReactNode
  hasNext: boolean
  onNextPage: () => void
  search: CatalogSearch
  onFilter: (patch: Partial<CatalogSearch>) => void
  onSearch: (q: string | undefined) => void
  items: NftSummary[]
  status: 'loading' | 'ready' | 'empty' | 'error' | 'auth'
  errorMessage?: string
  authRequired?: boolean
  onRetry: () => void
}) {
  const [draft, setDraft] = useState(query)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterTrigger = useRef<HTMLButtonElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const requesting = useRef(false)
  useEffect(() => { requesting.current = false }, [items.length, search.q, search.sort, search.category, search.network, search.minPrice, search.maxPrice])
  useEffect(() => {
    const element = sentinel.current
    if (!element || !hasNext) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !requesting.current) {
        requesting.current = true
        onNextPage()
      }
    }, { rootMargin: '0px 0px 160px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasNext, onNextPage])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(draft.trim() || undefined)
  }

  return (
    <main className="mx-auto flex min-h-[896px] w-full max-w-[414px] flex-col gap-4 rounded-[40px] bg-[var(--kurio-ink)] px-6 pt-10 pb-[142px] lg:hidden">
      <form onSubmit={submit} className="flex items-center gap-2">
        <label className="flex h-[45px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-[var(--kurio-card)] px-3 text-sm text-[var(--kurio-muted)]">
          <Search className="size-[22px] shrink-0" aria-hidden="true" />
          <span className="sr-only">Buscar</span>
          <input
            data-mobile-catalog-search
            value={draft}
            placeholder="Explorar coleções"
            className="min-w-0 flex-1 bg-transparent font-bold text-[var(--kurio-fg)] outline-none placeholder:text-[var(--kurio-muted)]"
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="button" ref={filterTrigger} aria-label="Filtros do catálogo"
          aria-haspopup="dialog" aria-expanded={filtersOpen} aria-controls={filtersOpen ? 'mobile-catalog-filters' : undefined}
          onClick={() => setFiltersOpen(true)}
          onFocus={() => { void import('@/features/catalog/mobile-catalog-filters') }}
          className="flex size-[45px] shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(137.05deg,rgba(210,138,76,.45)_-24.6%,#d28a4c_100%)] text-[var(--kurio-ink)]">
          <MobileNavIcon kind="filter" />
        </button>
        {filtersOpen ? <Suspense fallback={null}><MobileCatalogFilters onClose={() => setFiltersOpen(false)} triggerRef={filterTrigger}>{filters}</MobileCatalogFilters></Suspense> : null}
      </form>
      <section className="relative h-[190px] overflow-hidden rounded-[30px] bg-[linear-gradient(104.74deg,rgba(210,138,76,.2),rgba(210,138,76,.1))] px-4 pt-2 pb-4 shadow-[0_12px_30px_rgba(10,6,4,.45)]">
        <span aria-hidden="true" className="absolute -top-[31px] -left-20 size-[248px] rounded-full bg-[linear-gradient(160deg,rgba(221,154,95,.43),rgba(210,138,76,.04))]" />
        <span aria-hidden="true" className="absolute -top-[10px] left-[73px] size-[248px] rounded-full bg-[linear-gradient(160deg,rgba(221,154,95,.37),transparent)]" />
        <div className="relative z-10 w-[calc(100%_-_146px)]">
          <p className="text-xs leading-4 font-normal">Bem-vindo à Kurio</p>
          <h1 className="mt-1 text-[18px] leading-[29px] font-medium">SEJA DONO DA CULTURA DIGITAL</h1>
          <p className="mt-1.5 text-[12px] leading-[18px] text-[var(--kurio-secondary)]">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a href="#mercado-mobile" className="mt-1 inline-flex items-center gap-2 text-[12px] font-bold text-[var(--kurio-accent)]">
            EXPLORAR
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.2 8h9.6M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
        {items[0] ? (
          <img
            src={items[0].imageUrl}
            alt=""
            width={138}
            height={138}
            fetchPriority="high"
            className="absolute top-[10px] right-4 size-[138px] rounded-[20px] object-cover"
          />
        ) : null}
        {items[1] ? (
          <img
            src={items[1].imageUrl}
            alt=""
            width={58}
            height={58}
            className="absolute right-[82px] bottom-[34px] size-[58px] rounded-[17px] object-cover"
          />
        ) : null}
        <div className="absolute bottom-[7px] left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => <span key={dot} className="size-[7px] rounded-full bg-[var(--kurio-primary)]" />)}
        </div>
      </section>
      <div className="flex h-5 items-start gap-1 whitespace-nowrap text-left text-[14px] leading-4" aria-label="Visão do catálogo">
        {([
          { label: 'Todos os NFTs', sort: undefined },
          { label: 'Novos lançamentos', sort: 'recent' },
          { label: 'Em alta', sort: 'price-desc' },
        ] as const).map((tab) => (
          <button type="button" key={tab.label} aria-pressed={(search.sort ?? undefined) === tab.sort}
            onClick={() => onFilter({ sort: tab.sort })}
            className={(search.sort ?? undefined) === tab.sort ? 'border-b-2 border-[var(--kurio-primary)] pb-1 font-bold text-[var(--kurio-accent)]' : 'text-[var(--kurio-fg)]'}>
            {tab.label}
          </button>
        ))}
      </div>
      <h2 className="sr-only">Catálogo</h2>
      <div id="mercado-mobile" data-catalog-status={status}>
        {status === 'loading' ? <MobileCatalogSkeleton /> : null}
        {status === 'error' || status === 'auth' ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert">{authRequired ? 'Entre para ver os seus favoritos.' : errorMessage}</p>
            {authRequired ? (
              <a href="/login" className="text-sm font-bold text-[var(--kurio-accent)]">Entrar</a>
            ) : (
              <button type="button" className="text-sm font-bold text-[var(--kurio-accent)]" onClick={onRetry}>
                Tentar de novo
              </button>
            )}
          </div>
        ) : null}
        {status === 'empty' ? (
          <p>Nenhuma obra corresponde a essa busca.</p>
        ) : null}
        {status === 'ready' ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {items.map((nft, index) => (
              <MobileNftCard key={nft.id} nft={nft} priority={index === 0} staggered={index % 2 === 1} />
            ))}
          </div>
        ) : null}
      </div>
      <div ref={sentinel} className="h-px" aria-hidden="true" />
      {hasNext ? <button type="button" className="sr-only focus:not-sr-only" onClick={onNextPage}>Carregar mais NFTs</button> : null}
      <MobileTabBar />
    </main>
  )
}

function MobileNftCard({
  nft,
  priority,
  staggered,
}: {
  nft: NftSummary
  priority: boolean
  staggered: boolean
}) {
  return (
    <article
      className={`relative min-w-0 ${staggered ? 'translate-y-8' : ''}`}
      data-nft-id={nft.id}
    >
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nftSlug(nft.title) }}
        className="block rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kurio-primary)]"
      >
        <span className="flex h-[200px] items-center justify-center rounded-[20px] bg-[linear-gradient(143.28deg,#241612_-12%,#2F1D15_106.59%)] p-[4px]">
          <img
            src={nft.imageUrl}
            alt={nft.imageAlt}
            width={168}
            height={168}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            className={`aspect-square w-full max-w-[168px] rounded-[16px] object-cover ${staggered ? 'translate-y-1' : '-translate-y-1'}`}
          />
        </span>
        <h3 className="mt-2 truncate px-2 text-[15px] leading-5 font-normal">{nft.title}</h3>
        <p className="flex items-baseline gap-2 px-2 text-base leading-4">
          <span className="font-bold text-[var(--kurio-accent)]">{nft.priceEth} ETH</span>
          {nft.previousPriceEth ? (
            <span className="text-[11px] text-[var(--kurio-secondary)] line-through">{nft.previousPriceEth} ETH</span>
          ) : null}
        </p>
      </Link>
      {nft.previousPriceEth ? <span className="absolute top-4 left-0 flex h-8 w-[68px] items-center bg-[var(--kurio-primary)] px-2 text-[13px] leading-4 font-medium text-[var(--kurio-ink)]">RARO</span> : <div className="absolute top-3 right-3"><FavoriteButton nftId={nft.id} heart iconOnly className="size-7" /></div>}
    </article>
  )
}
