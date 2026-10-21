import { delay, http } from 'msw'
import {
  nftSlug,
  isCatalogNetwork,
  readCatalogPrice,
  isCatalogAvailability,
  isCatalogCategory,
  isCatalogSort,
  type CatalogAvailability,
  type CatalogCategory,
  type CatalogSort,
} from '@/api/contracts/catalog'
import { compareEth } from '@/api/contracts/money'
import { displayPrice, listPage, toDetail, toSummary } from '@/mocks/catalog-view'
import { readScenario, updateSimulation, type MockState, type MockUser } from '@/mocks/db'
import type { CatalogNftRecord } from '@/mocks/fixtures/nfts'
import { beginScenario, readBearer, simulationError } from '@/mocks/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readCategories(params: URLSearchParams) {
  const values = params.getAll('category').flatMap((value) => {
    if (!value.startsWith('[')) {
      return [value]
    }

    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch {
      return [value]
    }
  })

  const unique = new Set<CatalogCategory>()
  for (const value of values) {
    if (isCatalogCategory(value)) {
      unique.add(value)
    }
  }

  return [...unique]
}

function readListQuery(url: URL) {
  const pageRaw = Number(url.searchParams.get('page') ?? '1')
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const sortValue = url.searchParams.get('sort')
  const availabilityValue = url.searchParams.get('availability')
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80)

  return {
    q,
    minPrice: readCatalogPrice(url.searchParams.get('minPrice')),
    maxPrice: readCatalogPrice(url.searchParams.get('maxPrice')),
    network: isCatalogNetwork(url.searchParams.get('network')) ? url.searchParams.get('network') : undefined,
    category: readCategories(url.searchParams),
    availability: isCatalogAvailability(availabilityValue) ? availabilityValue : undefined,
    sort: (isCatalogSort(sortValue) ? sortValue : 'recent') satisfies CatalogSort,
    page,
    pageSize: url.searchParams.get('pageSize') === '6' ? 6 : 9,
    favorites: url.searchParams.get('favorites') === '1',
  }
}

async function requireCollector(request: Request) {
  if (readScenario(request) === 'session-expired') {
    return {
      response: simulationError(401, 'session_expired', 'Sua sessão expirou.'),
    }
  }

  const token = readBearer(request)
  const found: { current: MockUser | null } = { current: null }
  const now = Date.now()

  await updateSimulation((state) => {
    const session = token ? state.sessions.find((item) => item.token === token) : undefined
    if (!session || Date.parse(session.expiresAt) <= now) {
      return {
        ...state,
        sessions: token ? state.sessions.filter((item) => item.token !== token) : state.sessions,
      }
    }

    const user = state.users.find((item) => item.id === session.userId) ?? null
    found.current = user
    if (!user) {
      return {
        ...state,
        sessions: state.sessions.filter((item) => item.token !== token),
      }
    }

    return state
  })

  if (!found.current) {
    return {
      response: simulationError(401, 'unauthorized', 'Entre para guardar favoritos.'),
    }
  }

  return { user: found.current }
}

function favoriteIds(state: MockState, userId: string) {
  return state.favorites.filter((favorite) => favorite.userId === userId).map((favorite) => favorite.nftId)
}

function matchesQuery(nft: CatalogNftRecord, q: string) {
  if (!q) {
    return true
  }

  const needle = q.toLocaleLowerCase('pt-BR')
  return [nft.title, nft.artist, nft.collection].some((field) => field.toLocaleLowerCase('pt-BR').includes(needle))
}

function matchesAvailability(nft: CatalogNftRecord, availability: CatalogAvailability | undefined) {
  if (!availability) {
    return true
  }

  const remaining = nft.editions.reduce((sum, edition) => sum + edition.remaining, 0)
  return availability === 'available' ? remaining > 0 : remaining === 0
}

function sortNfts(nfts: CatalogNftRecord[], sort: CatalogSort) {
  const items = [...nfts]
  items.sort((left, right) => {
    if (sort === 'title') {
      return left.title.localeCompare(right.title, 'pt-BR')
    }

    if (sort === 'price-asc' || sort === 'price-desc') {
      const priceOrder = compareEth(displayPrice(left), displayPrice(right))
      const directed = sort === 'price-asc' ? priceOrder : -priceOrder
      return directed || right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title, 'pt-BR')
    }

    return right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title, 'pt-BR')
  })
  return items
}

export const catalogHandlers = [
  http.get('/api/highlights', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    let items: ReturnType<typeof toSummary>[] = []
    await updateSimulation((state) => {
      items = state.nfts
        .filter((nft) => nft.featured)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(toSummary)
      return state
    })

    return Response.json({
      items,
      page: 1,
      pageSize: items.length,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    })
  }),

  http.get('/api/nfts', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    const url = new URL(request.url)
    const query = readListQuery(url)

    if (scenario === 'out-of-order') {
      await delay(query.page === 1 ? 1400 : 80)
    }

    let collectorId: string | null = null
    if (query.favorites) {
      const gate = await requireCollector(request)
      if ('response' in gate) {
        return gate.response
      }
      collectorId = gate.user.id
    }

    let body: ReturnType<typeof listPage> | null = null
    await updateSimulation((state) => {
      const saved = collectorId ? new Set(favoriteIds(state, collectorId)) : null
      const filtered = state.nfts.filter((nft) => {
        const favoriteMatch = saved ? saved.has(nft.id) : true
        return (
          favoriteMatch &&
          matchesQuery(nft, query.q) &&
          (!query.minPrice || compareEth(displayPrice(nft), query.minPrice) >= 0) &&
          (!query.maxPrice || compareEth(displayPrice(nft), query.maxPrice) <= 0) &&
          (!query.network || (nft.network ?? 'ethereum') === query.network) &&
          (query.category.length === 0 || query.category.includes(nft.category)) &&
          matchesAvailability(nft, query.availability)
        )
      })
      body = listPage(sortNfts(filtered, query.sort).map(toSummary), query.page, query.pageSize)
      body.facets = { categories: {}, networks: {} }
      for (const nft of state.nfts) {
        body.facets.categories[nft.category] = (body.facets.categories[nft.category] ?? 0) + 1
        const network = nft.network ?? 'ethereum'
        body.facets.networks[network] = (body.facets.networks[network] ?? 0) + 1
      }
      return state
    })

    return Response.json(body ?? listPage([], query.page, query.pageSize))
  }),

  http.get('/api/nfts/:nftId', async ({ params, request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const nftId = String(params.nftId)
    let detail: ReturnType<typeof toDetail> | null = null
    await updateSimulation((state) => {
      const nft = state.nfts.find((item) => item.id === nftId || nftSlug(item.title) === nftId)
      detail = nft ? toDetail(nft) : null
      return state
    })

    if (!detail) {
      return simulationError(404, 'not_found', 'Esse NFT não existe.')
    }

    return Response.json(detail)
  }),

  http.get('/api/favorites', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const gate = await requireCollector(request)
    if ('response' in gate) {
      return gate.response
    }

    let nftIds: string[] = []
    await updateSimulation((state) => {
      nftIds = favoriteIds(state, gate.user.id)
      return state
    })

    return Response.json({ nftIds })
  }),

  http.post('/api/favorites', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    if (scenario === 'favorite-failure') {
      return simulationError(500, 'favorite_failed', 'Não foi possível atualizar os favoritos.')
    }

    const gate = await requireCollector(request)
    if ('response' in gate) {
      return gate.response
    }

    const body = await request.json().catch(() => null)
    const nftId = isRecord(body) && typeof body.nftId === 'string' ? body.nftId : ''
    if (!nftId) {
      return simulationError(422, 'validation_error', 'Informe o NFT.', {
        nftId: 'Informe o NFT.',
      })
    }

    let response: Response | null = null
    await updateSimulation((state) => {
      if (!state.nfts.some((nft) => nft.id === nftId)) {
        response = simulationError(404, 'not_found', 'Esse NFT não existe.')
        return state
      }

      const already = state.favorites.some((favorite) => favorite.userId === gate.user.id && favorite.nftId === nftId)
      const favorites = already ? state.favorites : [...state.favorites, { userId: gate.user.id, nftId }]
      response = Response.json({ nftIds: favoriteIds({ ...state, favorites }, gate.user.id) })
      return { ...state, favorites }
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível guardar o favorito.')
  }),

  http.delete('/api/favorites/:nftId', async ({ params, request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    if (scenario === 'favorite-failure') {
      return simulationError(500, 'favorite_failed', 'Não foi possível atualizar os favoritos.')
    }

    const gate = await requireCollector(request)
    if ('response' in gate) {
      return gate.response
    }

    const nftId = String(params.nftId)
    let nftIds: string[] = []
    await updateSimulation((state) => {
      const favorites = state.favorites.filter((favorite) => favorite.userId !== gate.user.id || favorite.nftId !== nftId)
      nftIds = favoriteIds({ ...state, favorites }, gate.user.id)
      return { ...state, favorites }
    })

    return Response.json({ nftIds })
  }),
]