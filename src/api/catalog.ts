import type { CatalogSearch, FavoriteList, NftDetail, NftListResponse } from '@/api/contracts/catalog'
import { http } from '@/api/http'

function toParams(search: CatalogSearch) {
  const params = new URLSearchParams()

  if (search.q) {
    params.set('q', search.q)
  }

  for (const category of search.category ?? []) {
    params.append('category', category)
  }

  if (search.availability) {
    params.set('availability', search.availability)
  }

  if (search.sort) {
    params.set('sort', search.sort)
  }

  if (search.page) {
    params.set('page', String(search.page))
  }

  if (search.pageSize) {
    params.set('pageSize', String(search.pageSize))
  }

  for (const key of ['minPrice', 'maxPrice', 'network'] as const) {
    if (search[key]) params.set(key, search[key])
  }

  if (search.favorites) {
    params.set('favorites', '1')
  }

  return params
}

export async function listNfts(search: CatalogSearch, signal?: AbortSignal) {
  const response = await http.get<NftListResponse>('/nfts', {
    params: toParams(search),
    signal,
  })
  return response.data
}

export async function listHighlights(signal?: AbortSignal) {
  const response = await http.get<NftListResponse>('/highlights', { signal })
  return response.data
}

export async function getNft(nftId: string, signal?: AbortSignal) {
  const response = await http.get<NftDetail>(`/nfts/${nftId}`, { signal })
  return response.data
}

export async function listFavorites(signal?: AbortSignal) {
  const response = await http.get<FavoriteList>('/favorites', { signal })
  return response.data
}

export async function addFavorite(nftId: string) {
  const response = await http.post<FavoriteList>('/favorites', { nftId })
  return response.data
}

export async function removeFavorite(nftId: string) {
  const response = await http.delete<FavoriteList>(`/favorites/${nftId}`)
  return response.data
}
