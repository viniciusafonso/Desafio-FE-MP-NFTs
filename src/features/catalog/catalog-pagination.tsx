import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import type { CatalogSearch } from '@/api/contracts/catalog'
import { pageButtonClass, pageButtonCurrentClass, pageButtonIdleClass } from '@/features/home/kurio-ui'

export function CatalogPagination({
  search,
  page,
  totalPages,
}: {
  search: CatalogSearch
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className="flex items-center gap-2" aria-label="Paginação do catálogo">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) =>
        item === page ? (
          <span key={item} aria-current="page" className={cn(pageButtonClass, pageButtonCurrentClass)}>
            {item}
          </span>
        ) : (
          <Link
            key={item}
            to="/"
            search={pageSearch(search, item)}
            activeOptions={{ exact: true, includeSearch: true }}
            className={cn(pageButtonClass, pageButtonIdleClass)}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link
          to="/"
          search={pageSearch(search, page + 1)}
          activeOptions={{ exact: true, includeSearch: true }}
          aria-label="Próxima página"
          className={cn(pageButtonClass, pageButtonIdleClass)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      ) : null}
    </nav>
  )
}

function pageSearch(search: CatalogSearch, page: number): CatalogSearch {
  return {
    ...search,
    page: page > 1 ? page : undefined,
  }
}
