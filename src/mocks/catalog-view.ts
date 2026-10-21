import { catalogArtwork } from '@/mocks/fixtures/artwork'
import type { CatalogNftRecord } from '@/mocks/fixtures/nfts'
import { catalogPageSize, type NftListResponse, type NftDetail, type NftEdition, type NftImage, type NftSummary } from '@/api/contracts/catalog'
import { compareEth } from '@/api/contracts/money'

export function coverOf(nft: CatalogNftRecord): NftImage {
  return {
    id: `${nft.id}-vista-1`,
    imageUrl: catalogArtwork[nft.artworkId ?? nft.id],
    imageAlt: [nft.title, nft.artist ? `de ${nft.artist}` : '', nft.collection ? `coleção ${nft.collection}` : ''].filter(Boolean).join(', '),
  }
}

// The reference repeats the same NFT artwork in four thumbnail slots.
// Reuse its exported asset rather than inserting other NFTs or unrelated images.
export function galleryOf(nft: CatalogNftRecord): NftImage[] {
  const cover = coverOf(nft)
  return Array.from({ length: 4 }, (_, index) => ({ ...cover, id: `${nft.id}-vista-${index + 1}` }))
}

export function editionView(edition: CatalogNftRecord['editions'][number]): NftEdition {
  return {
    ...edition,
    status: edition.remaining > 0 ? 'available' : 'sold-out',
  }
}

export function displayPrice(nft: CatalogNftRecord) {
  const available = nft.editions.filter((edition) => edition.remaining > 0)
  const pool = available.length > 0 ? available : nft.editions
  return pool.reduce((lowest, edition) => {
    return compareEth(edition.priceEth, lowest) < 0 ? edition.priceEth : lowest
  }, pool[0]?.priceEth ?? '0')
}

export function toSummary(nft: CatalogNftRecord): NftSummary {
  const cover = coverOf(nft)
  const remaining = nft.editions.reduce((sum, edition) => sum + edition.remaining, 0)
  const total = nft.editions.reduce((sum, edition) => sum + edition.total, 0)

  return {
    mobileOrder: mobileOrder(nft.id),
    id: nft.id,
    title: nft.title,
    artist: nft.artist,
    collection: nft.collection,
    category: nft.category,
    imageUrl: cover.imageUrl,
    imageAlt: cover.imageAlt,
    priceEth: displayPrice(nft),
    remaining,
    total,
    featured: nft.featured,
    previousPriceEth: nft.previousPriceEth,
  }
}

function mobileOrder(nftId: string) {
  const index = ['nft_beija_flor', 'nft_eco_laranja', 'nft_cipo_lento', 'nft_rio_sem_margem', 'nft_raiz_aberta', 'nft_dossel_noturno', 'nft_garca_parada', 'nft_golden_frequency_071', 'nft_folha_de_vidro'].indexOf(nftId)
  return index < 0 ? 99 : index
}

export function toDetail(nft: CatalogNftRecord): NftDetail {
  return {
    ...toSummary(nft),
    description: nft.description,
    createdAt: nft.createdAt,
    editions: nft.editions.map(editionView),
    gallery: galleryOf(nft),
    attributes: nft.attributes,
    reviewCount: nft.reviewCount,
    story: nft.story,
    notes: nft.notes,
  }
}

export function listPage(items: NftSummary[], page: number, pageSize: number = catalogPageSize): NftListResponse {
  const total = items.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages,
  }
}
