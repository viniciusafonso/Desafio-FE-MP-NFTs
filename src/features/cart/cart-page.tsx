import { nftSlug } from '@/api/contracts/catalog'
import { Link } from '@tanstack/react-router'
import { useIsMutating } from '@tanstack/react-query'
import { Minus, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { CartLine, CartQuote } from '@/api/contracts/cart'
import { isApiRequestError } from '@/api/errors'
import { KurioButton, kurioFieldClass } from '@/features/home/kurio-ui'
import { RelatedCollection as Related } from '@/features/catalog/related-collection'
import { KurioScreen } from '@/features/home/kurio-screen'
import { MobileBackButton, MobileNavIcon } from '@/features/home/mobile-chrome'
import { TextField } from '@/features/account/text-field'
import { useSession } from '@/features/account/use-session'
import { CartSkeleton } from '@/features/cart/cart-skeleton'
import {
  cartMutationKey,
  useApplyCoupon,
  useCart,
  useCartQuote,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartQuantity,
} from '@/features/cart/cart-state'
import { useRealtimeNotice } from '@/realtime/notices'

export function CartPage() {
  const cart = useCart()
  const session = useSession()
  const quote = useCartQuote(cart.isSuccess)
  const changing = useIsMutating({ mutationKey: cartMutationKey }) > 0
  const notice = useRealtimeNotice()

  if (cart.isPending) {
    return (
      <KurioScreen active="mercado">
        <h1 className="mb-6 text-[28px] leading-[37px] font-bold">Carrinho</h1>
        <CartSkeleton />
      </KurioScreen>
    )
  }

  if (cart.isError) {
    const message = isApiRequestError(cart.error) ? cart.error.message : 'Não foi possível carregar o carrinho.'
    return (
      <KurioScreen active="mercado">
        <h1 className="text-[28px] leading-[37px] font-bold">Carrinho</h1>
        <p role="alert">{message}</p>
        <KurioButton type="button" className="h-10 px-4 text-sm font-bold" onClick={() => void cart.refetch()}>
          Tentar de novo
        </KurioButton>
      </KurioScreen>
    )
  }

  const items = cart.data?.items ?? []

  return (
    <>
      <div className="lg:hidden">
        <main className="relative mx-auto min-h-[896px] w-full max-w-[414px] overflow-hidden rounded-[40px] bg-[var(--kurio-ink)] px-7 pt-8">
          <div className="flex h-[35px] items-center">
            <MobileBackButton to="/" />
            <h1 className="flex-1 text-center text-[20px] font-bold">Carrinho de NFTs</h1>
            <span className="size-[35px]" aria-hidden="true" />
          </div>
          {notice ? <p role="status" className="mt-2 text-sm">{notice}</p> : null}
          {items.length === 0 ? (
            <div className="mt-8" data-cart-status="empty">
              <p>Seu carrinho está vazio.</p>
              <Link to="/" className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--kurio-primary)] px-4 text-sm font-bold text-[var(--kurio-ink)]">
                Ver o catálogo
              </Link>
            </div>
          ) : (
            <ul className="mt-5 flex max-h-[462px] flex-col gap-5 overflow-y-auto pb-1" data-cart-status="ready" data-cart-count={items.length}>
              {items.map((item) => (
                <MobileCartRow key={item.id} item={item} issue={quote.data?.issues.find((entry) => entry.lineId === item.id)} />
              ))}
            </ul>
          )}
          <section className="absolute inset-x-0 bottom-0 h-[342px] rounded-t-[40px] bg-[var(--kurio-card)] px-6 pt-6 pb-9 shadow-[0_-14px_32px_rgba(10,6,4,.45)]">
            <CouponForm couponCode={cart.data?.couponCode ?? null} disabled={items.length === 0 || changing} compact />
            <MobileTotals quote={quote.data} />
            {items.length > 0 && quote.data?.issues.length === 0 ? (
              <CartCheckoutAction label={session.status === 'authenticated' ? 'Finalizar compra' : 'Conectar e finalizar'}
                disabled={quote.isFetching || quote.isError || cart.isFetching || changing || session.status === 'loading'}
                className="mt-5 flex h-[60px] w-full items-center justify-center rounded-[30px] bg-[var(--kurio-primary)] text-base font-bold text-[var(--kurio-ink)] disabled:opacity-50" />
            ) : null}
          </section>
        </main>
      </div>
      <div className="hidden lg:block">
      <KurioScreen active="mercado">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,782px)_minmax(0,332px)] lg:gap-x-[86px]">
      <section className="flex min-w-0 flex-col gap-4" aria-labelledby="carrinho-titulo">
        <h1 id="carrinho-titulo" className="text-[15px] leading-4 font-bold">Início / Mercado / Carrinho</h1>
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_160px_40px] gap-[18px] border-b border-[var(--kurio-border)] pb-2 text-base"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span></div>
        {notice ? (
          <p role="status" data-realtime-notice="">
            {notice}
          </p>
        ) : null}
        {items.length === 0 ? (
          <div className="flex flex-col items-start gap-3" data-cart-status="empty">
            <p>Seu carrinho está vazio.</p>
            <Link to="/" className="inline-flex h-10 items-center rounded-[var(--kurio-radius)] bg-[var(--kurio-primary)] px-4 text-sm font-bold text-[var(--kurio-ink)]">
              Ver o catálogo
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4" data-cart-status="ready" data-cart-count={items.length}>
            {items.map((item) => (
              <CartRow key={item.id} item={item} issue={quote.data?.issues.find((entry) => entry.lineId === item.id)} />
            ))}
          </ul>
        )}
      </section>
      <CartSummary
        quote={quote.data}
        couponCode={cart.data?.couponCode ?? null}
        hasItems={items.length > 0}
        checkoutLabel={session.status === 'authenticated' ? 'Finalizar compra' : 'Conectar e finalizar'}
        sessionLoading={session.status === 'loading'}
        loading={quote.isPending || quote.isFetching || cart.isFetching || changing}
        error={quote.isError ? (isApiRequestError(quote.error) ? quote.error.message : 'Não foi possível calcular o total.') : null}
        onRetry={() => void quote.refetch()}
      />
      </div>
      <div className="mt-16"><Related currentId="" title="Colecionadores também viram" /></div>
    </KurioScreen>
      </div>
    </>
  )
}

function MobileCartRow({ item, issue }: { item: CartLine; issue?: CartQuote['issues'][number] }) {
  const update = useUpdateCartQuantity()
  const remove = useRemoveCartItem()
  const pending = update.isPending || remove.isPending

  return (
    <li className="flex h-[100px] shrink-0 overflow-hidden rounded-[14px] bg-[var(--kurio-card)] shadow-[0_6px_18px_rgba(10,6,4,.3)]" data-cart-line={item.id}>
      <span className="size-[100px] shrink-0 overflow-hidden rounded-[14px] bg-cover bg-center" style={{ backgroundImage: `url("${item.imageUrl}")` }}>
        <img src={item.imageUrl} alt={item.imageAlt} width={100} height={100} className="size-[100px] object-cover mix-blend-multiply" />
      </span>
      <div className="min-w-0 flex-1 px-[10px] py-3">
        <p className="truncate text-[14px] font-bold">{item.title}</p>
        <p className="text-[13px] text-[var(--kurio-secondary)]">Edição: {item.editionName}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[16px] font-bold text-[var(--kurio-accent)]">{item.lineTotalEth} ETH</p>
          <div className="flex items-center gap-2">
            <button type="button" className="flex size-6 items-center justify-center rounded-full bg-[var(--kurio-border)] disabled:opacity-40" aria-label={`Diminuir ${item.title}`} disabled={pending || item.quantity <= 1} onClick={() => update.mutate({ lineId: item.id, quantity: item.quantity - 1 })}>
              <Minus className="size-3" aria-hidden="true" />
            </button>
            <span data-line-quantity={item.quantity}>{item.quantity}</span>
            <button type="button" className="flex size-6 items-center justify-center rounded-full bg-[var(--kurio-border)] disabled:opacity-40" aria-label={`Aumentar ${item.title}`} disabled={pending || item.quantity >= item.available} onClick={() => update.mutate({ lineId: item.id, quantity: item.quantity + 1 })}>
              <Plus className="size-3" aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Remover ${item.title}`} className="flex size-6 items-center justify-center text-[var(--kurio-primary)]" disabled={pending} onClick={() => remove.mutate(item.id)}>
              <MobileNavIcon kind="delete" />
            </button>
          </div>
        </div>
        {issue ? <p className="text-xs text-[var(--kurio-secondary)]">{issue.message}</p> : null}
      </div>
    </li>
  )
}

function MobileTotals({ quote }: { quote: CartQuote | undefined }) {
  return (
    <dl className="mt-4 flex flex-col gap-2 text-[15px]" data-quote-status={quote ? 'ready' : 'loading'}>
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd data-quote-subtotal={quote?.subtotalEth ?? ''}>{quote?.subtotalEth ?? '—'} ETH</dd>
      </div>
      <div className="flex justify-between">
        <dt>Desconto do lançamento</dt>
        <dd data-quote-discount={quote?.discountEth ?? ''}>{quote ? formatDiscount(quote.discountEth) : '—'}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Taxa de rede</dt>
        <dd className="text-right"><span data-quote-fee={quote?.networkFeeEth ?? ''}>{quote?.networkFeeEth ?? '—'} ETH</span>
          <span className="block text-xs text-[var(--kurio-accent)]">Taxa estimada</span>
        </dd>
      </div>
      <div className="flex justify-between text-[17px] font-bold">
        <dt>Total</dt>
        <dd className="text-[var(--kurio-accent)]" data-quote-total={quote?.totalEth ?? ''}>{quote?.totalEth ?? '—'} ETH</dd>
      </div>
    </dl>
  )
}

function CartRow({ item, issue }: { item: CartLine; issue?: CartQuote['issues'][number] }) {
  const update = useUpdateCartQuantity()
  const remove = useRemoveCartItem()
  const pending = update.isPending || remove.isPending
  const error = update.isError ? (isApiRequestError(update.error) ? update.error.message : 'Não foi possível atualizar.') : remove.isError ? 'Não foi possível remover.' : null
  return (
    <li data-cart-line={item.id}>
      <div className="grid min-h-[70px] grid-cols-[minmax(0,1fr)_120px_120px_160px_40px] items-center gap-[18px] bg-[var(--kurio-card)]">
        <Link to="/nfts/$nftId" params={{ nftId: nftSlug(item.title) }} className="flex min-w-0 items-center gap-4">
          <img src={item.imageUrl} alt={item.imageAlt} width={70} height={70} className="size-[70px] shrink-0 rounded-[6px] object-cover" />
          <span className="min-w-0"><strong className="block truncate text-base">{item.title}</strong><span className="text-sm text-[var(--kurio-muted)]">ID do token: #{item.title.split('#')[1]?.padStart(4, '0')}</span></span>
        </Link>
        <span className="text-base font-bold text-[var(--kurio-secondary)]" data-line-price={item.unitPriceEth}>{item.unitPriceEth} ETH</span>
        <div className="flex items-center gap-3">
          <KurioButton type="button" className="h-[30px] w-5 rounded-full" aria-label={`Diminuir quantidade de ${item.title}`} disabled={pending || item.quantity <= 1} onClick={() => update.mutate({ lineId: item.id, quantity: item.quantity - 1 })}>−</KurioButton>
          <span data-line-quantity={item.quantity}>{item.quantity}</span>
          <KurioButton type="button" className="h-[30px] w-5 rounded-full" aria-label={`Aumentar quantidade de ${item.title}`} disabled={pending || item.quantity >= item.available} onClick={() => update.mutate({ lineId: item.id, quantity: item.quantity + 1 })}>+</KurioButton>
        </div>
        <strong className="text-base text-[var(--kurio-accent)]">{item.lineTotalEth} ETH</strong>
        <button type="button" aria-label={`Remover ${item.title}`} disabled={pending} onClick={() => remove.mutate(item.id)} className="text-[var(--kurio-muted)]"><CartTrashIcon /></button>
      </div>
      {error || issue ? <p role="alert" className="mt-2 text-sm">{error ?? issue?.message}</p> : null}
    </li>
  )
}

function CartSummary({
  quote,
  couponCode,
  hasItems,
  loading,
  error,
  onRetry,
  checkoutLabel,
  sessionLoading,
}: {
  checkoutLabel: string
  sessionLoading: boolean
  quote: CartQuote | undefined
  couponCode: string | null
  hasItems: boolean
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  return (
    <aside className="flex h-fit flex-col gap-4 pt-7" aria-labelledby="resumo-titulo">
      <h2 id="resumo-titulo" className="border-b border-[var(--kurio-border)] pb-[7px] text-[18px] leading-4 font-bold">
        Resumo da carteira
      </h2>
      <CouponForm couponCode={couponCode} disabled={!hasItems || loading} />
      {error ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert">{error}</p>
          <KurioButton type="button" className="h-10 px-4 text-sm font-bold" onClick={onRetry}>
            Tentar de novo
          </KurioButton>
        </div>
      ) : null}
      <div aria-busy={loading} aria-live="polite" className="flex min-h-28 flex-col gap-3 text-[15px]" data-quote-status={quote ? 'ready' : 'loading'}>
        {loading ? <p className="sr-only">Atualizando valores.</p> : null}
        {quote ? (
          <>
            <p className="flex justify-between">Subtotal <span data-quote-subtotal={quote.subtotalEth}>{quote.subtotalEth} ETH</span></p>
            <p className="flex justify-between">Desconto do lançamento <span data-quote-discount={quote.discountEth}>{quote.discountEth} ETH</span></p>
            <p className="flex justify-between">Taxa de rede <span data-quote-fee={quote.networkFeeEth}>{quote.networkFeeEth} ETH</span></p>
            <p className="text-right text-xs text-[var(--kurio-accent)]">Taxa estimada</p>
            <p className="mt-4 flex justify-between text-lg font-bold">Total <span className="text-[var(--kurio-accent)]" data-quote-total={quote.totalEth}>{quote.totalEth} ETH</span></p>
          </>
        ) : (
          <div className="skeleton h-24 w-full rounded-lg" />
        )}
      </div>
      {hasItems && quote && quote.issues.length === 0 ? (
        <CartCheckoutAction label={checkoutLabel} disabled={loading || Boolean(error) || sessionLoading}
          className="inline-flex h-10 w-full items-center justify-center rounded-[4px] bg-[var(--kurio-primary)] px-4 text-sm font-bold text-[var(--kurio-ink)] disabled:opacity-50" />
      ) : null}
      {hasItems && quote && quote.issues.length > 0 ? (
        <p className="text-sm">Ajuste as quantidades antes de seguir para o pagamento.</p>
      ) : null}
      <Link to="/" className="text-center text-sm text-[var(--kurio-accent)]">Continuar explorando</Link>
    </aside>
  )
}

function CartCheckoutAction({ label, disabled, className }: { label: string; disabled: boolean; className: string }) {
  return disabled
    ? <button type="button" className={className} disabled>{label}</button>
    : <Link to="/checkout" className={className}>{label}</Link>
}

function CartTrashIcon() {
  return (
    <svg className="mx-auto size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 6.5h17M9 6.5V4.8c0-1 1-1.8 3-1.8s3 .8 3 1.8v1.7M5.5 6.5l.7 12c.1 1.6 1.3 2.5 5.8 2.5s5.7-.9 5.8-2.5l.7-12" />
    </svg>
  )
}

function CouponForm({ couponCode, disabled, compact = false }: { couponCode: string | null; disabled: boolean; compact?: boolean }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const error = localError ?? (apply.isError ? (isApiRequestError(apply.error) ? (apply.error.fields.code ?? apply.error.message) : 'Não foi possível aplicar o cupom.') : null)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = code.trim()
    if (!next) {
      setLocalError('Informe o cupom.')
      return
    }
    setLocalError(null)
    apply.mutate(next)
  }

  return (
    <form className={compact ? 'flex items-start gap-0' : 'relative flex items-start gap-0 pt-7'} onSubmit={onSubmit}>
        <TextField
        id="coupon-code"
        label={compact ? 'Digite o código promocional…' : 'Código promocional'}
        placeholder="Digite o código promocional…"
        containerClassName="min-w-0 flex-1"
        labelClassName={compact ? 'sr-only' : 'absolute top-0 left-0 text-sm font-bold'}
        value={code}
        autoComplete="off"
        disabled={disabled || apply.isPending}
        error={error ?? undefined}
        className={compact ? `${kurioFieldClass} h-[50px] rounded-r-none rounded-l-[25px] border-r-0 px-4 text-[13px]` : `${kurioFieldClass} rounded-r-none px-2 text-xs`}
        onChange={(event) => {
          setCode(event.target.value)
          setLocalError(null)
        }}
      />
      <div className={compact ? 'flex flex-wrap gap-2' : 'flex flex-wrap gap-2'}>
        <KurioButton type="submit" style={compact ? { backgroundColor: 'transparent', backgroundImage: 'linear-gradient(93.11deg, rgba(210,138,76,.54) -.94%, #d28a4c 105.02%)' } : undefined} className={compact ? 'h-[50px] w-[97px] rounded-[40px] bg-[linear-gradient(93.11deg,rgba(210,138,76,.54)_-.94%,#d28a4c_105.02%)] text-[15px] leading-4 font-bold text-[var(--kurio-fg)]' : 'h-10 px-4 text-sm font-bold'} disabled={disabled || apply.isPending}>
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </KurioButton>
        {couponCode ? (
          <button type="button" className="text-sm text-[var(--kurio-accent)]" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Remover cupom
          </button>
        ) : null}
      </div>
    </form>
  )
}

// Preserve every decimal returned by the quote; only pad for the Figma display.
function formatDiscount(value: string) {
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.')
  return `(-) ${whole.padStart(2, '0')}.${fraction.padEnd(2, '0')}`
}
