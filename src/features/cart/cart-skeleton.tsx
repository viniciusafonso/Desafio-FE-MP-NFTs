export function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true">
      <p className="sr-only">Carregando o carrinho.</p>
      <div className="flex flex-col gap-4">
        <div className="skeleton h-28 w-full rounded-xl" />
        <div className="skeleton h-28 w-full rounded-xl" />
      </div>
      <div className="skeleton h-64 w-full rounded-xl" />
    </div>
  )
}
