import { createFileRoute, Link, type ErrorComponentProps } from '@tanstack/react-router'
import { isApiRequestError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { PendingScreen } from '@/app/pending-screen'
import { NftDetailSkeleton } from '@/features/catalog/catalog-skeleton'
import { NftDetailPage } from '@/features/catalog/nft-detail-page'
import { nftQueryOptions } from '@/features/catalog/queries'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(nftQueryOptions(params.nftId)),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} · Kurio` : 'Detalhe · Kurio' },
      {
        name: 'description',
        content: loaderData?.description ?? 'Detalhe de um NFT da Kurio.',
      },
    ],
  }),
  pendingComponent: NftDetailPending,
  pendingMs: 200,
  errorComponent: NftDetailError,
  component: NftDetailRoute,
})

function NftDetailPending() {
  return <NftDetailSkeleton />
}

function NftDetailError({ error, reset }: ErrorComponentProps) {
  if (isApiRequestError(error) && error.status === 404) {
    return (
      <PendingScreen title="NFT não encontrado" description="Esse NFT não existe.">
        <Button asChild className="w-fit">
          <Link to="/">Voltar ao catálogo</Link>
        </Button>
      </PendingScreen>
    )
  }

  const message = isApiRequestError(error) ? error.message : 'Não foi possível abrir o NFT.'

  return (
    <PendingScreen title="Não foi possível abrir o NFT" description={message}>
      <Button type="button" className="w-fit" onClick={() => reset()}>
        Tentar de novo
      </Button>
    </PendingScreen>
  )
}

function NftDetailRoute() {
  const { nftId } = Route.useParams()
  return <NftDetailPage nftId={nftId} />
}
