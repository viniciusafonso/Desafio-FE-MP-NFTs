import { Link, useNavigate } from '@tanstack/react-router'
import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import type { NftDetail, NftImage } from '@/api/contracts/catalog'
import { AddToCartButton } from '@/features/cart/add-to-cart-button'
import { FavoriteButton } from '@/features/catalog/favorite-button'
import { RelatedCollection } from '@/features/catalog/related-collection'
import { HomeFooter, HomeHeader } from '@/features/home/home-sections'

export default function DesktopNftDetail({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate()
  return <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 px-6 py-6 xl:gap-24 xl:px-[120px]">
    <div className="flex flex-col gap-8">
      <HomeHeader query="" active="mercado" onSearch={(q) => { void navigate({ to: '/', search: { q } }) }} />
      <Product key={nft.id} nft={nft} />
    </div>
    <Story nft={nft} />
    <RelatedCollection currentId={nft.id} />
    <HomeFooter />
  </main>
}

function Product({ nft }: { nft: NftDetail }) {
  const [zoomed, setZoomed] = useState(false)
  const [imageId, setImageId] = useState(nft.gallery[0]?.id)
  const image = nft.gallery.find((item) => item.id === imageId) ?? nft.gallery[0]
    ?? { id: nft.id, imageUrl: nft.imageUrl, imageAlt: nft.imageAlt }
  const zoomOpener = useRef<HTMLButtonElement | null>(null)
  function openZoom(event: MouseEvent<HTMLButtonElement>) {
    zoomOpener.current = event.currentTarget
    setZoomed(true)
  }
  const token = tokenId(nft.title)
  const reviews = nft.reviewCount ? `${nft.reviewCount} avaliações de colecionadores` : nft.artist

  return (
    <section className="flex w-full flex-col items-start gap-3">
      <p className="text-[15px] leading-4 font-bold">
        <Link to="/" className="hover:text-[var(--kurio-accent)]">
          Início
        </Link>
        {' / '}
        <Link to="/" hash="mercado" className="hover:text-[var(--kurio-accent)]">
          Mercado
        </Link>
      </p>
      <div className="flex w-full flex-col items-start gap-8 lg:flex-row">
        <div className="relative flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7 lg:w-[573px] lg:shrink-0">
          <ThumbnailColumn images={nft.gallery} selectedId={image.id} onSelect={setImageId} />
          <button type="button" onClick={openZoom} aria-label={`Ampliar imagem de ${nft.title}`} data-gallery-main={image.id} className="flex aspect-square w-full max-w-[444px] cursor-zoom-in items-center justify-center rounded-[6px] bg-[var(--kurio-card)] p-4">
            <img
              src={image.imageUrl}
              alt={image.imageAlt}
              width={404}
              height={404}
              fetchPriority="high"
              className="size-full rounded-[24px] object-cover"
            />
          </button>
          <button
            type="button"
            className="absolute top-[15px] right-3 flex size-[30px] items-center justify-center rounded-full border border-[var(--kurio-border)] bg-[#2f1d15] text-[var(--kurio-fg)]"
            aria-label="Ampliar a obra"
            onClick={openZoom}
          >
            <MagnifierIcon />
          </button>
        </div>
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-between gap-5 lg:h-[448px]">
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] leading-[37px] font-bold">{nft.title}</h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[22px] leading-4 font-bold text-[var(--kurio-accent)]">{nft.priceEth} ETH</p>
              <p className="flex items-center gap-1 text-[15px] leading-5">
                <Stars />
                <span>{reviews}</span>
              </p>
            </div>
          </div>
          <div className="h-px w-full shrink-0 bg-[var(--kurio-border)]" />
          <div className="flex max-w-[574px] flex-col gap-3">
            <h2 className="text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
            <p className="text-sm leading-6 text-[var(--kurio-secondary)]">{nft.description || 'Descrição não informada para esta obra.'}</p>
          </div>
          <EditionRow nft={nft} />
          <div className="flex flex-col gap-3 text-[15px] leading-5 text-[var(--kurio-muted)]">
            {token ? <p>ID do token: {token}</p> : null}
            {nft.collection ? <p>Coleção: {nft.collection}</p> : null}
            {nft.attributes && nft.attributes.length > 0 ? <p>Atributos: {nft.attributes.join(', ')}</p> : null}
            <ShareRow />
          </div>
        </div>
      </div>
      <Dialog.Root open={zoomed} onOpenChange={setZoomed}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-fit max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-[var(--kurio-card)] p-4"
            onCloseAutoFocus={(event) => { event.preventDefault(); zoomOpener.current?.focus() }}>
            <Dialog.Title className="sr-only">Ampliação de {nft.title}</Dialog.Title>
            <Dialog.Description className="sr-only">Imagem selecionada da galeria em tamanho ampliado.</Dialog.Description>
            <img src={image.imageUrl} alt={image.imageAlt} className="max-h-[80vh] max-w-[80vw] rounded-[16px] object-contain" />
            <Dialog.Close aria-label="Fechar a ampliação" className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full border border-[var(--kurio-border)] bg-[var(--kurio-card)] text-[var(--kurio-fg)]">×</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function ThumbnailColumn({ images, selectedId, onSelect }: {
  images: NftImage[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-row gap-4 overflow-x-auto sm:flex-col" role="group" aria-label="Imagens deste NFT">
      {images.map((image, index) => (
        <button key={image.id} type="button" aria-label={`Mostrar imagem ${index + 1}`} aria-pressed={image.id === selectedId}
          onClick={() => onSelect(image.id)}
          className={image.id === selectedId
            ? 'size-[100px] shrink-0 overflow-hidden rounded-[8px] border border-[var(--kurio-primary)]'
            : 'size-[100px] shrink-0 overflow-hidden rounded-[8px]'}>
          <img src={image.imageUrl} alt="" className="size-full object-cover" />
        </button>
      ))}
    </div>
  )
}

function EditionRow({ nft }: { nft: NftDetail }) {
  const first = nft.editions.find((edition) => edition.name === '1/50' && edition.remaining > 0)
    ?? nft.editions.find((edition) => edition.remaining > 0)
    ?? null
  const [editionId, setEditionId] = useState(first?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const edition = nft.editions.find((item) => item.id === editionId) ?? null
  const soldOut = !edition || edition.remaining === 0
  const max = edition?.remaining ?? 0
  const nextQuantity = soldOut ? 0 : Math.min(Math.max(quantity, 1), max)

  return (
    <div className="flex flex-col gap-3" data-selected-edition={edition?.id ?? ''}>
      <h2 className="text-[15px] leading-4 font-bold">Edição:</h2>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Edição">
        {nft.editions.map((item) => {
          const selected = item.id === edition?.id
          const unavailable = item.remaining === 0
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              disabled={unavailable}
              className={
                selected
                  ? 'flex h-7 items-center justify-center rounded-[14px] border border-[var(--kurio-primary)] px-1.5 text-sm leading-4 font-medium text-[var(--kurio-accent)]'
                  : 'flex h-7 items-center justify-center rounded-[14px] border border-[var(--kurio-border)] px-1.5 text-sm leading-4 text-[var(--kurio-secondary)] disabled:opacity-40'
              }
              onClick={() => {
                setEditionId(item.id)
                setQuantity(1)
              }}
            >
              {item.name}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-[49.5px] w-[33px] items-center justify-center rounded-[33px] border border-[var(--kurio-ink)] bg-[var(--kurio-primary)] text-black shadow-[0_6.6px_19.8px_-3.3px_rgba(20,13,10,0.15)] disabled:opacity-40"
            aria-label="Diminuir quantidade"
            disabled={soldOut || nextQuantity <= 1}
            onClick={() => setQuantity(nextQuantity - 1)}
          >
            <MinusIcon />
          </button>
          <span className="min-w-[13px] text-center text-xl leading-7">{nextQuantity}</span>
          <button
            type="button"
            className="flex h-[49.5px] w-[33px] items-center justify-center rounded-[33px] border border-[var(--kurio-ink)] bg-[var(--kurio-primary)] text-black shadow-[0_6.6px_19.8px_-3.3px_rgba(20,13,10,0.15)] disabled:opacity-40"
            aria-label="Aumentar quantidade"
            disabled={soldOut || nextQuantity >= max}
            onClick={() => setQuantity(nextQuantity + 1)}
          >
            <PlusIcon />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddToCartButton
            appearance="kurio"
            label="COMPRAR"
            nftId={nft.id}
            editionId={edition?.id ?? ''}
            quantity={nextQuantity}
            disabled={soldOut}
          />
          <FavoriteButton nftId={nft.id} heart />
        </div>
      </div>
      {soldOut ? (
        <p role="alert" className="text-sm text-[var(--kurio-secondary)]">
          Esta edição está esgotada.
        </p>
      ) : null}
    </div>
  )
}

function ShareRow() {
  const [notice, setNotice] = useState<string | null>(null)

  async function share(label: string) {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setNotice(`Link copiado para compartilhar no ${label}.`)
    } catch {
      setNotice(`Não foi possível copiar o link de ${label}.`)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-[15px] leading-4 font-bold text-[var(--kurio-fg)]">Compartilhar este NFT:</p>
        <ShareButton label="LinkedIn" onClick={() => void share('LinkedIn')}>
          <LinkedinIcon />
        </ShareButton>
        <ShareButton label="mensagem" onClick={() => void share('mensagem')}>
          <MessageIcon />
        </ShareButton>
        <ShareButton label="Twitter" onClick={() => void share('Twitter')}>
          <TwitterIcon />
        </ShareButton>
      </div>
      {notice ? (
        <p role="status" className="text-sm text-[var(--kurio-secondary)]">
          {notice}
        </p>
      ) : null}
    </div>
  )
}

function ShareButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="text-[var(--kurio-fg)]" aria-label={`Compartilhar no ${label}`} onClick={onClick}>
      {children}
    </button>
  )
}

function Story({ nft }: { nft: NftDetail }) {
  const [tab, setTab] = useState<'details' | 'reviews'>('details')
  const paragraphs = nft.story && nft.story.length > 0 ? nft.story : [nft.description]
  const reviewLabel = nft.reviewCount ? `Avaliações de colecionadores (${nft.reviewCount})` : 'Avaliações de colecionadores'

  return (
    <section className="flex min-h-[340px] w-full flex-col gap-2.5">
      <div className="flex flex-wrap gap-8 border-b border-[var(--kurio-border)]">
        <button type="button" className="relative pb-3" aria-pressed={tab === 'details'} onClick={() => setTab('details')}>
          <span className={tab === 'details' ? 'text-[17px] leading-4 font-bold text-[var(--kurio-accent)]' : 'text-[17px] leading-4 text-[var(--kurio-fg)]'}>
            Detalhes do NFT
          </span>
          {tab === 'details' ? <span className="absolute -bottom-px left-0 h-[3px] w-full bg-[var(--kurio-primary)]" /> : null}
        </button>
        <button type="button" className="relative pb-3" aria-pressed={tab === 'reviews'} onClick={() => setTab('reviews')}>
          <span className={tab === 'reviews' ? 'text-[17px] leading-4 font-bold text-[var(--kurio-accent)]' : 'text-[17px] leading-4 text-[var(--kurio-fg)]'}>
            {reviewLabel}
          </span>
          {tab === 'reviews' ? <span className="absolute -bottom-px left-0 h-[3px] w-full bg-[var(--kurio-primary)]" /> : null}
        </button>
      </div>
      {tab === 'details' ? (
        <div className="flex flex-col gap-3 text-sm leading-6">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-[var(--kurio-secondary)]">
              {paragraph}
            </p>
          ))}
          {(nft.notes ?? []).map((fact) => (
            <p key={fact.label}>
              <span className="block font-bold">{fact.label}</span><span className="text-[var(--kurio-secondary)]">{fact.text}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-[var(--kurio-secondary)]">
          {nft.reviewCount
            ? `As ${nft.reviewCount} avaliações de colecionadores desta obra ficam neste painel.`
            : `As avaliações de ${nft.title} ficam neste painel.`}
        </p>
      )}
    </section>
  )
}

function tokenId(title: string) {
  const match = title.match(/#(\d+)/)
  if (!match) {
    return null
  }
  return `#${match[1].padStart(4, '0')}`
}

function Stars() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon key={index} muted={index === 4} />
      ))}
    </span>
  )
}

function StarIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 15 15" className={muted ? 'size-[15px] text-[var(--kurio-secondary)]' : 'size-[15px] text-[var(--kurio-primary)]'}>
      <path fill="currentColor" d="M7.5 1.1 9.2 5.1h4.1L10.2 7.6l1.2 4L7.5 9.4 3.6 11.6l1.2-4L2.2 5.1h4.1L7.5 1.1Z" />
    </svg>
  )
}

function MagnifierIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 15 15" className="h-[14px] w-[15px]" aria-hidden="true">
      <path fill="currentColor" d="M3.4 15H.3V5h3.1v10ZM1.8 3.6C.8 3.6 0 2.8 0 1.8S.8 0 1.8 0s1.8.8 1.8 1.8-.8 1.8-1.8 1.8ZM15 15h-3.1v-5.2c0-1.5-.6-2.5-1.9-2.5-1 0-1.6.7-1.8 1.3-.1.2-.1.6-.1.9V15H4.9s.1-8.6 0-9.5h3.1v1.5c.4-.7 1.2-1.7 3-1.7 2.2 0 3.9 1.4 3.9 4.5V15Z" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 18 18" className="size-[18px]" fill="none" aria-hidden="true">
      <path d="M3 4.5h12v8H7l-4 2.5V4.5Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 16 13" className="h-[12px] w-4" aria-hidden="true">
      <path fill="currentColor" d="M16 1.5a6.4 6.4 0 0 1-1.9.5A3.3 3.3 0 0 0 15.6 0a6.6 6.6 0 0 1-2.1.8A3.3 3.3 0 0 0 7.8 3.3a9.3 9.3 0 0 1-6.8-3.4 3.3 3.3 0 0 0 1 4.4A3.3 3.3 0 0 1 .6 4v.1a3.3 3.3 0 0 0 2.6 3.2 3.3 3.3 0 0 1-1.5.1 3.3 3.3 0 0 0 3.1 2.3A6.6 6.6 0 0 1 0 11.5 9.3 9.3 0 0 0 5.1 13c6.1 0 9.4-5 9.4-9.4v-.4A6.7 6.7 0 0 0 16 1.5Z" />
    </svg>
  )
}
