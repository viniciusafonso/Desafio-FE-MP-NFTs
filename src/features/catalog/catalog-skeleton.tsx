export function CatalogCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="skeleton aspect-[3/4] w-full rounded-xl" />
      <div className="skeleton h-5 w-3/4 rounded-md" />
      <div className="skeleton h-4 w-1/2 rounded-md" />
      <div className="skeleton h-4 w-1/3 rounded-md" />
    </div>
  )
}

export function CatalogGridSkeleton({
  count = 6,
  className = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <CatalogCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function NftDetailSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2" aria-busy="true">
      <p className="sr-only">Carregando a obra.</p>
      <div className="skeleton aspect-[3/4] w-full rounded-xl" />
      <div className="flex flex-col gap-4">
        <div className="skeleton h-8 w-2/3 rounded-md" />
        <div className="skeleton h-4 w-1/2 rounded-md" />
        <div className="skeleton h-20 w-full rounded-md" />
        <div className="skeleton h-24 w-full rounded-md" />
        <div className="skeleton h-8 w-32 rounded-lg" />
      </div>
    </div>
  )
}
