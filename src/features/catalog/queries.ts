import { queryOptions, useQuery } from '@tanstack/react-query'
import { getNft, listHighlights, listNfts } from '@/api/catalog'
import type { CatalogSearch } from '@/api/contracts/catalog'
import { isApiRequestError } from '@/api/errors'

export const catalogKeys = {
  highlights: ['catalog', 'highlights'] as const,
  list: (search: CatalogSearch) => ['catalog', 'list', search] as const,
  detail: (nftId: string) => ['catalog', 'detail', nftId] as const,
  favorites: ['catalog', 'favorites'] as const,
}

function catalogRetry(failureCount: number, error: unknown) {
  if (isApiRequestError(error) && (error.status === 401 || error.status === 404 || error.status === 422)) {
    return false
  }

  return failureCount < 1
}

export function nftQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: catalogKeys.detail(nftId),
    queryFn: ({ signal }) => getNft(nftId, signal),
    retry: catalogRetry,
  })
}

export function useHighlights() {
  return useQuery({
    queryKey: catalogKeys.highlights,
    queryFn: ({ signal }) => listHighlights(signal),
    retry: catalogRetry,
  })
}

export function useCatalogList(search: CatalogSearch) {
  return useQuery({
    queryKey: catalogKeys.list(search),
    queryFn: ({ signal }) => listNfts(search, signal),
    retry: catalogRetry,
  })
}
