import { nftSlug } from '@/api/contracts/catalog'
import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/api/contracts/catalog'

const linkClassName =
  'rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

type NftCardProps = {
  nft: NftSummary
  priority?: boolean
}

export function NftCard({ nft, priority = false }: NftCardProps) {
  return (
    <article className="flex min-w-0 flex-col gap-3" data-nft-id={nft.id}>
      <Link to="/nfts/$nftId" params={{ nftId: nftSlug(nft.title) }} className={`${linkClassName} flex flex-col gap-3`}>
        <span className="flex h-[300px] items-center justify-center bg-[var(--kurio-card)] px-1">
          <img
            src={nft.imageUrl}
            alt={nft.imageAlt}
            width={250}
            height={250}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            className="h-auto max-h-[286px] w-auto max-w-full rounded-[15px] object-contain"
          />
        </span>
        <div className="flex flex-col">
        <h3 className="text-[15px] leading-5 font-normal text-[var(--kurio-fg)]">{nft.title}</h3>
        <p className="flex items-baseline gap-2">
          <span className="text-base leading-4 font-bold text-[var(--kurio-accent)]">{nft.priceEth} ETH</span>
          {nft.previousPriceEth ? (
            <span className="text-base leading-4 text-[var(--kurio-secondary)] line-through">{nft.previousPriceEth} ETH</span>
          ) : null}
        </p>
        </div>
      </Link>
    </article>
  )
}
