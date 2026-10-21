import type { CatalogCategory, CatalogSort } from '@/api/contracts/catalog'

export const categoryLabels: Record<CatalogCategory, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const sortLabels: Record<CatalogSort, string> = {
  recent: 'Mais recentes',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  title: 'Nome',
}
