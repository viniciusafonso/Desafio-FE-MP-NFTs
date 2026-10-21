import { catalogArtwork } from '@/mocks/fixtures/artwork'
import { nftSlug, type CatalogCategory } from '@/api/contracts/catalog'

export type CatalogEditionRecord = {
  id: string
  name: string
  total: number
  remaining: number
  priceEth: string
}

export type CatalogNftRecord = {
  id: string
  title: string
  artist: string
  collection: string
  category: CatalogCategory
  artworkId?: string
  network?: 'ethereum' | 'polygon' | 'solana'
  description: string
  createdAt: string
  featured: boolean
  version?: number
  previousPriceEth?: string
  attributes?: string[]
  reviewCount?: number
  story?: string[]
  notes?: { label: string; text: string }[]
  editions: CatalogEditionRecord[]
}

export type FavoriteSeed = {
  userId: string
  nftId: string
}

function openEdition(nftId: string, total: number, remaining: number, priceEth: string): CatalogEditionRecord {
  return {
    id: `${nftId}_aberta`,
    name: 'Aberta',
    total,
    remaining,
    priceEth,
  }
}

const originalCatalog: CatalogNftRecord[] = [
  {
    id: 'nft_golden_frequency_071', title: 'Golden Frequency #071', artist: '',
    collection: '', category: 'arte-digital', description: '',
    createdAt: '2026-08-10T15:00:00.000Z', featured: false,
    editions: [openEdition('nft_golden_frequency_071', 50, 50, '0.59')],
  },
  {
    id: 'nft_folha_de_vidro',
    title: 'Golden Signal #160',
    artist: '',
    collection: '',
    category: 'arte-digital',
    description: '',
    createdAt: '2026-08-02T15:00:00.000Z',
    featured: true,
    editions: [openEdition('nft_folha_de_vidro', 10, 8, '0.39')],
  },
  {
    id: 'nft_dossel_noturno',
    title: 'Violet Nomad #314',
    artist: '',
    collection: '',
    category: 'arte-digital',
    description: '',
    createdAt: '2026-09-01T15:00:00.000Z',
    featured: true,
    editions: [openEdition('nft_dossel_noturno', 6, 4, '1.39')],
  },
  {
    id: 'nft_beija_flor',
    title: 'Emerald Ape #042',
    artist: 'Nova Sato',
    collection: 'Kurio Apes',
    category: 'arte-digital',
    description:
      'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
    createdAt: '2026-09-20T15:00:00.000Z',
    featured: true,
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    reviewCount: 19,
    story: [
      'Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.',
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    notes: [
      { label: 'Rede:', text: 'Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.' },
      {
        label: 'Contrato:',
        text: 'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
      },
      { label: 'Direitos autorais:', text: '0x7A42...19E8 • Contrato inteligente ERC-721 verificado.' },
    ],
    editions: [
      { id: 'nft_beija_flor_1', name: '1/1', total: 1, remaining: 1, priceEth: '1.19' },
      { id: 'nft_beija_flor_10', name: '1/10', total: 10, remaining: 10, priceEth: '1.19' },
      { id: 'nft_beija_flor_50', name: '1/50', total: 50, remaining: 50, priceEth: '1.19' },
      { id: 'nft_beija_flor_aberta', name: 'ABERTA', total: 9, remaining: 2, priceEth: '1.19' },
    ],
  },
  {
    id: 'nft_rio_sem_margem',
    title: 'Golden Beat #207',
    artist: '',
    collection: '',
    category: 'arte-digital',
    description: '',
    createdAt: '2026-08-22T15:00:00.000Z',
    featured: false,
    editions: [openEdition('nft_rio_sem_margem', 5, 5, '0.99')],
  },
  {
    id: 'nft_garca_parada',
    title: 'Ivory Baron #088',
    artist: '',
    collection: '',
    category: 'arte-digital',
    description: '',
    createdAt: '2026-08-28T15:00:00.000Z',
    featured: false,
    editions: [openEdition('nft_garca_parada', 6, 6, '1.79')],
  },
  {
    id: 'nft_cipo_lento',
    title: 'Neon Vessel #552',
    artist: '',
    collection: '',
    category: 'arte-digital',
    description: '',
    createdAt: '2026-09-12T15:00:00.000Z',
    featured: false,
    previousPriceEth: '2.29',
    editions: [openEdition('nft_cipo_lento', 9, 2, '1.99')],
  },
  {
    id: 'nft_raiz_aberta',
    title: 'Cosmic Bloom #118',
    artist: '',
    collection: '',
    category: 'arte-digital',
    description: '',
    createdAt: '2026-09-05T15:00:00.000Z',
    featured: false,
    editions: [openEdition('nft_raiz_aberta', 4, 4, '1.29')],
  },
  {
    id: 'nft_eco_laranja',
    title: 'Sage Nomad #009',
    artist: '',
    collection: '',
    category: 'arte-digital',
    description: '',
    createdAt: '2026-09-18T15:00:00.000Z',
    featured: false,
    editions: [openEdition('nft_eco_laranja', 2, 2, '1.69')],
  },

]

// Preserve the original showcase; older fixtures provide the three remaining pages.
const identifiedCatalog = originalCatalog.filter((nft) => Object.hasOwn(catalogArtwork, nft.id))
const additionalCatalog: CatalogNftRecord[] = [1, 2, 3].flatMap((batch) =>
  identifiedCatalog.map((source, index) => {
    const title = source.title.replace(/#(\d+)/, (_, token: string) => `#${Number(token) + batch * 1000}`)
    const id = `nft_${nftSlug(title).replaceAll('-', '_')}`
    return {
      id,
      title,
      artworkId: source.id,
      artist: source.artist,
      collection: source.collection,
      category: batch === 1 ? 'colecionaveis' : 'arte-digital',
      network: 'ethereum',
      description: source.description || 'Um colecionável digital da coleção Kurio Editions.',
      createdAt: `2026-07-${String(31 - (batch - 1) * 9 - index).padStart(2, '0')}T12:00:00.000Z`,
      featured: false,
      editions: source.editions.map((edition, editionIndex) => ({ ...edition, id: `${id}_${editionIndex + 1}` })),
    }
  }),
)

export const catalogFixtures = [...identifiedCatalog, ...additionalCatalog]

export const favoriteSeed: FavoriteSeed[] = [
  { userId: 'usr_marina_costa', nftId: 'nft_folha_de_vidro' },
  { userId: 'usr_rafael_nunes', nftId: 'nft_dossel_noturno' },
]
