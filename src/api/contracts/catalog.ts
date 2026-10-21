export const catalogCategories = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis', 'generativa', 'jogos', 'assinaturas', 'utilidade'] as const

export type CatalogCategory = (typeof catalogCategories)[number]

export const catalogSorts = ['recent', 'price-asc', 'price-desc', 'title'] as const

export type CatalogSort = (typeof catalogSorts)[number]

export const catalogAvailabilities = ['available', 'sold-out'] as const

export type CatalogAvailability = (typeof catalogAvailabilities)[number]

export const catalogNetworks = ['ethereum', 'polygon', 'solana'] as const
export type CatalogNetwork = (typeof catalogNetworks)[number]

export const catalogPageSize = 9

export type CatalogSearch = {
  q?: string
  category?: CatalogCategory[]
  availability?: CatalogAvailability
  sort?: CatalogSort
  page?: number
  pageSize?: 6 | 9
  minPrice?: string
  maxPrice?: string
  network?: CatalogNetwork
  favorites?: true
}

export type NftImage = {
  id: string
  imageUrl: string
  imageAlt: string
}

export type NftEdition = {
  id: string
  name: string
  total: number
  remaining: number
  priceEth: string
  status: 'available' | 'sold-out'
}

export type NftSummary = {
  id: string
  title: string
  artist: string
  collection: string
  category: CatalogCategory
  imageUrl: string
  imageAlt: string
  priceEth: string
  remaining: number
  total: number
  featured: boolean
  mobileOrder?: number
  previousPriceEth?: string
}

export type NftDetail = NftSummary & {
  description: string
  createdAt: string
  editions: NftEdition[]
  gallery: NftImage[]
  attributes?: string[]
  reviewCount?: number
  story?: string[]
  notes?: { label: string; text: string }[]
}

export type CatalogFacets = { categories: Partial<Record<CatalogCategory, number>>; networks: Partial<Record<CatalogNetwork, number>> }

export type NftListResponse = {
  facets?: CatalogFacets
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type FavoriteList = {
  nftIds: string[]
}

export function isCatalogCategory(value: unknown): value is CatalogCategory {
  return typeof value === 'string' && catalogCategories.includes(value as CatalogCategory)
}

export function isCatalogSort(value: unknown): value is CatalogSort {
  return typeof value === 'string' && catalogSorts.includes(value as CatalogSort)
}

export function isCatalogAvailability(value: unknown): value is CatalogAvailability {
  return typeof value === 'string' && catalogAvailabilities.includes(value as CatalogAvailability)
}

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const q = readQuery(search.q)
  const category = readCategories(search.category)
  const availability = isCatalogAvailability(search.availability) ? search.availability : undefined
  const sort = isCatalogSort(search.sort) && search.sort !== 'recent' ? search.sort : undefined
  const page = readPage(search.page)
  const favorites =
    search.favorites === true || search.favorites === 'true' || search.favorites === '1' || search.favorites === 1
      ? true
      : undefined

  return {
    q,
    minPrice: readCatalogPrice(search.minPrice),
    maxPrice: readCatalogPrice(search.maxPrice),
    network: isCatalogNetwork(search.network) ? search.network : undefined,
    category: category.length > 0 ? category : undefined,
    availability,
    sort,
    page,
    pageSize: Number(search.pageSize) === 6 ? 6 : undefined,
    favorites,
  }
}

function readQuery(value: unknown) {
  const text = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
  const trimmed = text.trim().slice(0, 80)
  return trimmed ? trimmed : undefined
}

function readCategories(value: unknown) {
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value]
  const unique = new Set<CatalogCategory>()

  for (const item of list) {
    if (isCatalogCategory(item)) {
      unique.add(item)
    }
  }

  return [...unique]
}

function readPage(value: unknown) {
  const page = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isInteger(page) || page <= 1) {
    return undefined
  }

  return page
}

// A readable route segment; the stable API identity remains independent of the title.
export function nftSlug(title: string) {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function isCatalogNetwork(value: unknown): value is CatalogNetwork {
  return typeof value === 'string' && catalogNetworks.includes(value as CatalogNetwork)
}

export function readCatalogPrice(value: unknown): string | undefined {
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && text.length <= 30 && /^\d+(?:\.\d{1,8})?$/.test(text) ? text : undefined
}
