import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { nftSlug, catalogSorts, type CatalogSearch, type NftSummary } from '@/api/contracts/catalog'
import { isApiRequestError } from '@/api/errors'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { CatalogGridSkeleton } from '@/features/catalog/catalog-skeleton'
import { sortLabels } from '@/features/catalog/labels'
import { NftCard } from '@/features/catalog/nft-card'
import type { useCatalogList } from '@/features/catalog/queries'
import { HomeFooter, HomeHeader, HomeHero, HomeJournal, HomePromos } from '@/features/home/home-sections'
import { CatalogPagination } from '@/features/catalog/catalog-pagination'

type DesktopCatalogProps = {
  backdrop: boolean
  hash: string
  search: CatalogSearch
  onSearch: (q: string | undefined) => void
  apply: (patch: Partial<CatalogSearch>) => void
  filters: ReactNode
  featured: NftSummary | undefined
  highlightsPending: boolean
  list: ReturnType<typeof useCatalogList>
  items: NftSummary[]
  authRequired: boolean
  returnTo: string
}

export default function DesktopCatalog({ backdrop, hash, search, onSearch, apply, filters, featured, highlightsPending, list, items, authRequired, returnTo }: DesktopCatalogProps) {
  return (
    <main className={cn("mx-auto hidden w-full max-w-[1440px] flex-col px-6 py-6 lg:flex xl:px-[120px]", backdrop ? "gap-11" : "gap-16 xl:gap-24")}>

      <div className={cn("flex flex-col", backdrop ? "gap-3" : "gap-8")}>
        <HomeHeader active={hash === 'mercado' ? 'mercado' : 'inicio'} key={search.q ?? ''} query={search.q ?? ''} onSearch={onSearch} />
        <HomeHero />
      </div>

      <section id="mercado" className="flex w-full flex-col gap-12 lg:min-h-[1373px] lg:flex-row" aria-labelledby="catalogo-titulo">
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[310px]">
          {filters}
          {!backdrop ? <FeaturedBanner nft={featured} pending={highlightsPending} /> : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 id="catalogo-titulo" className="sr-only">
              Catálogo
            </h2>
            <div className="flex flex-wrap gap-5 text-[15px] leading-4 font-medium" role="tablist" aria-label="Recortes do catálogo">
              <FilterTab active={!search.sort} onClick={() => apply({ sort: undefined })}>
                Todos os NFTs
              </FilterTab>
              <FilterTab
                active={search.sort === 'recent'}
                onClick={() => apply({ sort: 'recent' })}
              >
                Novos lançamentos
              </FilterTab>
              <FilterTab active={search.sort === 'price-desc'} onClick={() => apply({ sort: 'price-desc' })}>
                Em alta
              </FilterTab>
            </div>
            <label className="flex items-center gap-2 text-[15px] leading-5">
              Ordenar por:
              <select
                id="catalog-sort"
                aria-label="Ordenar por"
                className="bg-transparent text-[var(--kurio-fg)] outline-none"
                value={search.sort ?? 'recent'}
                onChange={(event) => {
                  const value = event.target.value
                  apply({
                    sort: value === 'price-asc' || value === 'price-desc' || value === 'title' ? value : undefined,
                  })
                }}
              >
                {catalogSorts.map((sort) => (
                  <option key={sort} value={sort} className="text-[var(--kurio-ink)]">
                    {sort === 'recent' ? 'Listados recentemente' : sortLabels[sort]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="sr-only" aria-live="polite">
            {list.data ? `${list.data.total} ${list.data.total === 1 ? 'obra encontrada' : 'obras encontradas'}.` : ''}
          </p>

          {list.isPending ? (
            <div aria-busy="true" data-catalog-status="loading">
              <p className="sr-only">Carregando o catálogo.</p>
              <CatalogGridSkeleton className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3" />
            </div>
          ) : null}

          {list.isError && authRequired ? (
            <div className="flex flex-col items-start gap-3" data-catalog-status="auth">
              <p role="alert">Entre para ver os seus favoritos.</p>
              <Button asChild className="w-fit bg-[var(--kurio-primary)] text-[var(--kurio-ink)]">
                <Link to="/login" search={{ redirect: returnTo }}>
                  Entrar
                </Link>
              </Button>
            </div>
          ) : null}

          {list.isError && !authRequired ? (
            <div className="flex flex-col items-start gap-3" data-catalog-status="error">
              <p role="alert">
                {isApiRequestError(list.error) ? list.error.message : 'Não foi possível carregar o catálogo.'}
              </p>
              <Button type="button" variant="outline" className="w-fit" onClick={() => void list.refetch()}>
                Tentar de novo
              </Button>
            </div>
          ) : null}

          {list.data && !authRequired ? (
            <div data-catalog-status={items.length === 0 ? 'empty' : 'ready'} data-catalog-total={list.data.total}>
              {items.length === 0 ? (
                <p>
                  {search.favorites
                    ? 'Você ainda não guardou favoritos com esses filtros.'
                    : 'Nenhuma obra corresponde a essa busca.'}
                </p>
              ) : (
                <div className={cn("grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8 xl:gap-y-[72px]")}>
                  {items.map((nft, index) => (
                    <NftCard key={nft.id} nft={nft} priority={index === 0} />
                  ))}
                </div>
              )}
              <div className="mt-8 flex justify-end">
                <CatalogPagination search={search} page={list.data.page} totalPages={list.data.totalPages} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!backdrop ? <><HomePromos /><HomeJournal /><HomeFooter /></> : null}
    </main>
  )
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? 'border-b-2 border-[var(--kurio-primary)] pb-1 text-[var(--kurio-accent)]' : 'text-[var(--kurio-fg)]'}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function FeaturedBanner({ nft, pending }: { nft: NftSummary | undefined; pending: boolean }) {
  return (
    <section
      className="flex min-h-[470px] flex-col gap-4 bg-[linear-gradient(180deg,rgba(210,138,76,0.1)_0%,rgba(210,138,76,0.03)_100%)] pt-6 pb-1"
      aria-labelledby="destaque-titulo"
    >
      <div className="px-5 text-center">
        <h2 id="destaque-titulo" className="text-2xl leading-8 font-bold text-[var(--kurio-accent)]">
          NFT EM DESTAQUE
        </h2>
        <p className="mt-4 text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      </div>
      {pending ? <p className="sr-only">Carregando destaques.</p> : null}
      {nft ? (
        <Link to="/nfts/$nftId" params={{ nftId: nftSlug(nft.title) }} className="mt-auto">
          <img src="/figma/featured.png" alt={nft.imageAlt} className="h-[368px] w-full rounded-[22px] object-cover" />
        </Link>
      ) : null}
    </section>
  )
}

