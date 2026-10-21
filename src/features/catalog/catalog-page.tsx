import { useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { lazy, Suspense, useCallback } from 'react'
import type { CatalogSearch } from '@/api/contracts/catalog'
import { isApiRequestError } from '@/api/errors'
import { CatalogGridSkeleton } from '@/features/catalog/catalog-skeleton'
import { useCatalogList, useHighlights } from '@/features/catalog/queries'
import { MobileHome } from '@/features/home/mobile-home'
import { CatalogFilters } from '@/features/catalog/catalog-filters'
import { useDesktopAuth } from '@/features/account/use-desktop-auth'
import { useQueries } from '@tanstack/react-query'
import { catalogKeys } from '@/features/catalog/queries'
import { listNfts } from '@/api/catalog'
import { useFavoriteState } from '@/features/catalog/use-favorites'

const DesktopCatalog = lazy(() => import('@/features/catalog/catalog-desktop'))

type CatalogPageProps = {
  backdrop?: boolean
  search: CatalogSearch
}

export function CatalogPage({ search, backdrop = false }: CatalogPageProps) {
  const navigate = useNavigate({ from: '/' })
  const router = useRouter()
  const location = useLocation()
  const desktop = useDesktopAuth()
  const highlights = useHighlights(desktop)
  const list = useCatalogList(search)
  const previousPages = useQueries({ queries: Array.from({ length: desktop ? 0 : Math.max(0, (search.page ?? 1) - 1) }, (_, index) => {
    const pageSearch = { ...search, page: index + 1 > 1 ? index + 1 : undefined }
    return { queryKey: catalogKeys.list(pageSearch), queryFn: ({ signal }: { signal: AbortSignal }) => listNfts(pageSearch, signal) }
  }) })
  const mobileItems = [...previousPages.map((query) => query.data?.items ?? []), list.data?.items ?? []].flatMap((pageItems) => !search.sort && !search.q ? [...pageItems].sort((left, right) => (left.mobileOrder ?? 99) - (right.mobileOrder ?? 99)) : pageItems)
  const favorites = useFavoriteState()
  const returnTo = `${location.pathname}${location.searchStr}`

  const apply = useCallback(
    (patch: Partial<CatalogSearch>) => {
      void navigate({
        search: (current) => ({
          ...current,
          ...patch,
          page: undefined,
        }),
      })
    },
    [navigate],
  )

  const onSearch = useCallback(
    (q: string | undefined) => {
      apply({ q })
    },
    [apply],
  )

  const items = list.data
    ? search.favorites && favorites.ready
      ? list.data.items.filter((item) => favorites.ids.has(item.id))
      : list.data.items
    : []
  const authRequired = isApiRequestError(list.error) && list.error.status === 401
  const mobileStatus = list.isPending && !mobileItems.length
    ? 'loading'
    : list.isError
      ? authRequired
        ? 'auth'
        : 'error'
      : mobileItems.length === 0
        ? 'empty'
        : 'ready'
  const featured = list.data?.items.find((nft) => nft.title === 'Sage Nomad #009') ?? highlights.data?.items.find((nft) => nft.title === 'Violet Nomad #314')
  const filters = <CatalogFilters key={`${search.minPrice ?? ''}:${search.maxPrice ?? ''}`} facets={list.data?.facets} search={search} onChange={apply} />

  return (
    <>
      {!desktop ? <MobileHome
        key={search.q ?? ''}
        search={search}
        onFilter={apply}
        query={search.q ?? ''}
        onSearch={onSearch}
        filters={filters}
        hasNext={Boolean(list.data && list.data.page < list.data.totalPages && !list.isFetching && previousPages.every((query) => query.isSuccess && !query.isFetching))}
        onNextPage={() => {
          if (router.state.location.pathname !== '/' || router.state.location.searchStr !== location.searchStr || router.state.status !== 'idle') return
          void navigate({ search: (current) => ({ ...current, page: (current.page ?? 1) + 1 }), resetScroll: false })
        }}
        items={mobileItems}
        status={mobileStatus}
        authRequired={authRequired}
        errorMessage={isApiRequestError(list.error) ? list.error.message : 'Não foi possível carregar o catálogo.'}
        onRetry={() => void list.refetch()}
      /> : null}
      {desktop ? <Suspense fallback={<div className="mx-auto w-full max-w-[1200px] px-6 py-8" aria-busy="true"><p className="sr-only">Carregando o catálogo.</p><CatalogGridSkeleton /></div>}>
        <DesktopCatalog backdrop={backdrop} hash={location.hash} search={search} onSearch={onSearch} apply={apply}
          filters={filters} featured={featured} highlightsPending={highlights.isPending} list={list} items={items}
          authRequired={authRequired} returnTo={returnTo} />
      </Suspense> : null}
    </>
  )
}
