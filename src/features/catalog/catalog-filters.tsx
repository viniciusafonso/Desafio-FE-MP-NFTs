import { useState } from 'react'
import { catalogCategories, type CatalogSearch, type CatalogFacets } from '@/api/contracts/catalog'
import { categoryLabels } from '@/features/catalog/labels'
import { KurioButton } from '@/features/home/kurio-ui'
import { cn } from 'cn'

export function CatalogFilters({ search, onChange, facets }: {
  search: CatalogSearch
  facets?: CatalogFacets
  onChange: (patch: Partial<CatalogSearch>) => void
}) {
  const [minPrice, setMinPrice] = useState(search.minPrice ?? '0.02')
  const [maxPrice, setMaxPrice] = useState(search.maxPrice ?? '12.30')
  return (
    <div className="flex flex-col gap-10 bg-[var(--kurio-card)] p-5">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg leading-4 font-bold">Coleções</h2>
        <div className="flex flex-col px-3">
          {catalogCategories.map((category) => {
            const active = search.category?.includes(category) ?? false
            return (
              <button key={category} type="button" aria-pressed={active}
                className={cn('flex h-10 w-full items-center justify-between text-left text-[15px] leading-10', active ? 'text-[var(--kurio-accent)]' : 'text-[var(--kurio-secondary)]')}
                onClick={() => {
                  const categories = new Set(search.category)
                  if (categories.has(category)) categories.delete(category)
                  else categories.add(category)
                  onChange({ category: categories.size ? [...categories] : undefined })
                }}>
                <span>{categoryLabels[category]}</span><span>{`(${facets?.categories[category] ?? 0})`}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-lg leading-4 font-bold">Faixa de preço</h2>
        <div className="relative mx-3 h-[18px]">
          <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-[var(--kurio-primary)]" />
          <input type="range" aria-label="Preço mínimo" className="catalog-price-range" min="0.02" max="12.30" step="0.01" value={minPrice}
            onChange={(event) => setMinPrice(Math.min(Number(event.target.value), Number(maxPrice)).toFixed(2))} />
          <input type="range" aria-label="Preço máximo" className="catalog-price-range" min="0.02" max="12.30" step="0.01" value={maxPrice}
            onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), Number(minPrice)).toFixed(2))} />
        </div>
        <p className="pl-3 text-[15px] leading-5">Preço: {minPrice.replace('.', ',')} - {maxPrice.replace('.', ',')} ETH</p>
        <KurioButton className="h-9 w-fit px-3 text-base leading-5 font-bold"
          onClick={() => onChange({ minPrice: minPrice === '0.02' ? undefined : minPrice, maxPrice: maxPrice === '12.30' ? undefined : maxPrice })}>
          Aplicar
        </KurioButton>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-lg leading-4 font-bold">Rede</h2>
        <div className="flex flex-col pl-3">
          {(['ethereum', 'polygon', 'solana'] as const).map((network, index) => (
            <button key={network} type="button" aria-pressed={search.network === network}
              className={cn('flex h-10 items-center justify-between text-[15px] leading-10', search.network === network ? 'text-[var(--kurio-accent)]' : 'text-[var(--kurio-secondary)]')}
              onClick={() => onChange({ network: search.network === network ? undefined : network })}>
              <span>{['Ethereum', 'Polygon', 'Solana'][index]}</span><span>{`(${facets?.networks[network] ?? 0})`}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
