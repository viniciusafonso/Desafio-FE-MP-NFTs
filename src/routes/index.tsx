import { createFileRoute } from '@tanstack/react-router'
import { validateCatalogSearch } from '@/api/contracts/catalog'
import { CatalogPage } from '@/features/catalog/catalog-page'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  head: () => ({
    meta: [
      { title: 'Início · Kurio' },
      {
        name: 'description',
        content: 'Catálogo de NFTs da Kurio, com busca, filtros e destaques.',
      },
    ],
  }),
  component: CatalogRoute,
})

function CatalogRoute() {
  const search = Route.useSearch()
  return <CatalogPage search={search} />
}
