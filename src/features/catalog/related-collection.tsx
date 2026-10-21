import { nftSlug } from '@/api/contracts/catalog'
import { Link } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { nftQueryOptions } from '@/features/catalog/queries'

const relatedFrame = [
  'nft_raiz_aberta',
  'nft_dossel_noturno',
  'nft_garca_parada',
  'nft_rio_sem_margem',
  'nft_folha_de_vidro',
]

export function RelatedCollection({ currentId, title = "Mais desta coleção" }: { currentId: string; title?: string }) {
  const ids = relatedFrame.includes(currentId)
    ? ['nft_beija_flor', ...relatedFrame.filter((id) => id !== currentId)].slice(0, 5)
    : relatedFrame
  const items = useQueries({
    queries: ids.map((id) => nftQueryOptions(id)),
  })

  return (
    <section className="flex w-full flex-col gap-8" aria-labelledby="colecao-titulo">
      <div className="flex flex-col gap-[11px]">
        <h2 id="colecao-titulo" className="text-[17px] leading-4 font-bold text-[var(--kurio-accent)]">
          {title}
        </h2>
        <div className="h-px w-full bg-[var(--kurio-primary)]" />
      </div>
      <div className="grid grid-cols-2 gap-7 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item, index) => {
          const nft = item.data
          if (!nft) {
            return <div key={ids[index]} className="h-[303px] rounded-[6px] bg-[var(--kurio-card)]" />
          }
          return (
            <article key={nft.id} className="flex min-w-0 flex-col gap-3">
              <Link to="/nfts/$nftId" params={{ nftId: nftSlug(nft.title) }} className="flex h-[255px] items-center justify-center rounded-[6px] bg-[var(--kurio-card)] p-1">
                <img src={nft.imageUrl} alt={nft.imageAlt} className="h-auto max-h-[243px] max-w-full rounded-[13px] object-contain" />
              </Link>
              <div><h3 className="text-[15px] leading-5">{nft.title}</h3>
              <p className="text-base leading-4 font-bold text-[var(--kurio-accent)]">{nft.priceEth} ETH</p></div>
            </article>
          )
        })}
      </div>
      <div className="flex justify-center gap-2" aria-hidden="true">
        <span className="size-3 rounded-full border-[1.3px] border-[var(--kurio-primary)]" />
        <span className="size-3 rounded-full bg-[var(--kurio-primary)]" />
        <span className="size-3 rounded-full border-[1.3px] border-[var(--kurio-primary)]" />
      </div>
    </section>
  )
}

