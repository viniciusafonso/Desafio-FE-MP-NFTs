import type { PaymentNetwork, WalletDetails } from '@/api/contracts/wallets'
import { isAvatarId } from '@/api/contracts/profile'
import { isMockScenario, type MockScenario } from '@/api/contracts/scenarios'
import { collectorFixtures } from '@/mocks/fixtures/collectors'
import { catalogFixtures, favoriteSeed, type CatalogNftRecord, type FavoriteSeed } from '@/mocks/fixtures/nfts'
import { walletFixtures } from '@/mocks/fixtures/wallets'

const databaseName = 'greenmint-simulation'
const storeName = 'records'
const stateKey = 'state'

export type MockUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  avatarUrl?: string | null
  username?: string
  ens?: string
  walletLabel?: string
  avatarId: string | null
  createdAt: string
}

export type MockSession = {
  token: string
  userId: string
  expiresAt: string
}

export type MockFavorite = FavoriteSeed

export type MockCartLine = {
  id: string
  nftId: string
  editionId: string
  quantity: number
}

export type MockCart = {
  ownerId: string
  lines: MockCartLine[]
  couponCode: string | null
}

export type MockWallet = WalletDetails & {
  sameAsPrimary?: boolean
  id: string
  userId: string
  label: string
  role: 'primary' | 'secondary'
  address: string
  connectedNetwork: PaymentNetwork | null
}

export type MockOrderItem = {
  nftId: string
  editionId: string
  title: string
  artist: string
  editionName: string
  imageUrl: string
  imageAlt: string
  unitPriceEth: string
  quantity: number
  lineTotalEth: string
}

export type MockOrder = {
  id: string
  userId: string
  status: 'pending' | 'confirmed' | 'refused'
  idempotencyKey: string
  fingerprint: string
  version: number
  createdAt: string
  updatedAt: string
  collector?: Record<string, string>
  buyerName: string
  buyerEmail: string
  walletId: string
  walletLabel: string
  walletAddress: string
  networkId: PaymentNetwork
  networkName: string
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  couponPercent: number | null
  items: MockOrderItem[]
  transactionRef: string | null
  refusalReason: string | null
}

export type MockState = {
  users: MockUser[]
  sessions: MockSession[]
  nfts: CatalogNftRecord[]
  favorites: MockFavorite[]
  carts: MockCart[]
  wallets: MockWallet[]
  orders: MockOrder[]
}

type PersistedState = {
  users?: MockUser[]
  sessions?: MockSession[]
  nfts?: CatalogNftRecord[]
  favorites?: MockFavorite[]
  carts?: MockCart[]
  wallets?: MockWallet[]
  orders?: MockOrder[]
}

let chain: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>) {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      reject(request.error ?? new Error('Não foi possível abrir a simulação.'))
    }
  })
}

function readRaw() {
  return openDatabase().then(
    (database) =>
      new Promise<PersistedState | null>((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly')
        const request = transaction.objectStore(storeName).get(stateKey)
        request.onsuccess = () => {
          resolve((request.result as PersistedState | undefined) ?? null)
        }
        request.onerror = () => {
          reject(request.error ?? new Error('Não foi possível ler a simulação.'))
        }
      }),
  )
}

function writeRaw(state: MockState) {
  return openDatabase().then(
    (database) =>
      new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite')
        const request = transaction.objectStore(storeName).put(state, stateKey)
        request.onsuccess = () => resolve()
        request.onerror = () => {
          reject(request.error ?? new Error('Não foi possível gravar a simulação.'))
        }
      }),
  )
}

export async function hashPassword(password: string) {
  const encoded = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function createSeedState(): Promise<MockState> {
  const createdAt = '2026-01-15T12:00:00.000Z'
  const users = await Promise.all(
    collectorFixtures.map(async (collector) => ({
      id: collector.id,
      name: collector.name,
      username: collector.username, ens: collector.ens, walletLabel: collector.walletLabel,
      email: collector.email,
      passwordHash: await hashPassword(collector.password),
      avatarId: collector.avatarId,
      createdAt,
    })),
  )

  return {
    users,
    sessions: [],
    nfts: structuredClone(catalogFixtures),
    favorites: structuredClone(favoriteSeed),
    carts: [],
    wallets: structuredClone(walletFixtures),
    orders: [],
  }
}

function hydrateUser(user: MockUser): MockUser {
  if (isAvatarId(user.avatarId) || user.avatarId === null) {
    return user
  }

  const fixture = collectorFixtures.find((collector) => collector.id === user.id)
  return { ...user, avatarId: fixture?.avatarId ?? null }
}

function usersReady(users: MockUser[] | undefined) {
  return (
    Array.isArray(users) &&
    users.every((user) => Object.hasOwn(user, 'avatarId') && (user.avatarId === null || isAvatarId(user.avatarId)))
  )
}

function syncCatalog(nfts: CatalogNftRecord[]) {
  const fixtures = new Map(catalogFixtures.map((nft) => [nft.id, nft]))
  let changed = nfts.some((nft) => !fixtures.has(nft.id))
  const next = nfts.filter((nft) => fixtures.has(nft.id)).map((nft) => {
    const fixture = fixtures.get(nft.id)
    if (!fixture) {
      return nft
    }

    const sameEditions =
      nft.editions.length === fixture.editions.length &&
      nft.editions.every((edition, index) => edition.id === fixture.editions[index]?.id)
    const editions = !sameEditions
      ? structuredClone(fixture.editions)
      : nft.editions.map((edition) => {
          const source = fixture.editions.find((item) => item.id === edition.id)
          if (!source || source.priceEth === edition.priceEth || (nft.version ?? 1) > 1) {
            return edition
          }
          changed = true
          return { ...edition, priceEth: source.priceEth }
        })
    if (!sameEditions) {
      changed = true
    }
    if (
      nft.artworkId !== fixture.artworkId ||
      nft.category !== fixture.category ||
      nft.title !== fixture.title ||
      nft.previousPriceEth !== fixture.previousPriceEth ||
      nft.collection !== fixture.collection ||
      nft.description !== fixture.description ||
      nft.artist !== fixture.artist ||
      nft.reviewCount !== fixture.reviewCount ||
      JSON.stringify(nft.attributes) !== JSON.stringify(fixture.attributes) ||
      JSON.stringify(nft.story) !== JSON.stringify(fixture.story) ||
      JSON.stringify(nft.notes) !== JSON.stringify(fixture.notes)
    ) {
      changed = true
    }

    const nextNft = {
      ...nft,
      title: fixture.title,
      category: fixture.category,
      artworkId: fixture.artworkId,
      collection: fixture.collection,
      description: fixture.description,
      artist: fixture.artist,
      editions,
    }
    if (fixture.attributes) {
      nextNft.attributes = fixture.attributes
    } else {
      delete nextNft.attributes
    }
    if (fixture.reviewCount) {
      nextNft.reviewCount = fixture.reviewCount
    } else {
      delete nextNft.reviewCount
    }
    if (fixture.story) {
      nextNft.story = fixture.story
    } else {
      delete nextNft.story
    }
    if (fixture.notes) {
      nextNft.notes = fixture.notes
    } else {
      delete nextNft.notes
    }
    if (fixture.previousPriceEth) {
      nextNft.previousPriceEth = fixture.previousPriceEth
    } else {
      delete nextNft.previousPriceEth
    }
    return nextNft
  })

  for (const fixture of catalogFixtures) {
    if (!next.some((nft) => nft.id === fixture.id)) {
      next.push(structuredClone(fixture))
      changed = true
    }
  }
  return { nfts: next, changed }
}
function completeState(state: PersistedState): { state: MockState; changed: boolean } | null {
  if (!Array.isArray(state.users) || !Array.isArray(state.sessions)) {
    return null
  }

  const catalog = Array.isArray(state.nfts) ? syncCatalog(state.nfts) : { nfts: structuredClone(catalogFixtures), changed: true }
  const incomplete =
    !Array.isArray(state.nfts) ||
    !Array.isArray(state.favorites) ||
    !Array.isArray(state.carts) ||
    !Array.isArray(state.wallets) ||
    !Array.isArray(state.orders) ||
    !usersReady(state.users)

  return {
    changed: catalog.changed || incomplete,
    state: {
      users: state.users.map((user) => hydrateUser(user)),
      sessions: state.sessions,
      nfts: catalog.nfts,
      favorites: Array.isArray(state.favorites) ? state.favorites : structuredClone(favoriteSeed),
      carts: Array.isArray(state.carts) ? state.carts : [],
      wallets: Array.isArray(state.wallets) ? state.wallets.map((wallet) => ({ ...wallet, address: ({
          'gm1marina-verde-7f3a': '0xA91F00000000000000000000000000000000E82C',
          'gm1marina-musgo-1c90': 'nova.kurio.eth',
          'gm1rafael-verde-44b2': '0xB0020000000000000000000000000000000044B2',
        } as Record<string, string>)[wallet.address] ?? wallet.address })) : structuredClone(walletFixtures),
      orders: Array.isArray(state.orders) ? state.orders : [],
    },
  }
}

async function loadOrSeed() {
  const existing = await readRaw()
  const completed = existing ? completeState(existing) : null
  if (completed) {
    if (completed.changed) {
      await writeRaw(completed.state)
    }
    return completed.state
  }

  const seeded = await createSeedState()
  await writeRaw(seeded)
  return seeded
}

export function updateSimulation(change: (state: MockState) => MockState | Promise<MockState>) {
  return enqueue(async () => {
    const current = await loadOrSeed()
    const next = await change(current)
    await writeRaw(next)
    return next
  })
}

export function resetSimulation() {
  return enqueue(async () => {
    const seeded = await createSeedState()
    await writeRaw(seeded)
    return seeded
  })
}

export function readScenario(request: Request): MockScenario {
  const header = request.headers.get('x-mock-scenario')
  return header && isMockScenario(header) ? header : 'default'
}
