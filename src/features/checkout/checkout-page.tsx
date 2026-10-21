import { validateCheckoutCollector } from '@/api/contracts/checkout-validation'
import { MobileBackButton } from '@/features/home/mobile-chrome'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, MoreVertical, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { quoteFingerprint, type CreateOrderRequest } from '@/api/contracts/orders'
import { paymentNetworks, type PaymentNetwork } from '@/api/contracts/wallets'
import type { CartLine, CartQuote } from '@/api/contracts/cart'
import { clearOrderAttempt, readOrderAttempt, saveOrderAttempt } from '@/api/checkout-attempt'
import { createOrder } from '@/api/orders'
import { isApiRequestError } from '@/api/errors'
import { KurioButton, kurioFieldClass } from '@/features/home/kurio-ui'
import { KurioScreen } from '@/features/home/kurio-screen'
import { TextField } from '@/features/account/text-field'
import { useDesktopAuth } from '@/features/account/use-desktop-auth'
import { useSession } from '@/features/account/use-session'
import { cartKeys, useCart, useCartQuote } from '@/features/cart/cart-state'
import { useWalletConnection, useWallets } from '@/features/checkout/wallet-state'
import { orderKeys } from '@/features/orders/order-state'
import { useRealtimeNotice } from '@/realtime/notices'
import { clearSessionToken, markSessionExpired } from '@/api/session-storage'
import { rememberVersion } from '@/realtime/versions'

function acknowledgementKey(quote: CartQuote, items: CartLine[]) {
  return quoteFingerprint({
    subtotalEth: quote.subtotalEth,
    discountEth: quote.discountEth,
    networkFeeEth: quote.networkFeeEth,
    totalEth: quote.totalEth,
    couponCode: quote.coupon?.code ?? null,
    items: items.map((item) => ({
      lineId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      unitPriceEth: item.unitPriceEth,
      quantity: item.quantity,
    })),
  })
}

export function CheckoutPage() {
  const desktop = useDesktopAuth()
  const submitting = useRef(false)
  const submissionVersion = useRef(0)
  const [provider, setProvider] = useState('Coinbase Wallet')
  const [collector, setCollector] = useState<Record<string, string>>({})
  const session = useSession()
  const cart = useCart()
  const quote = useCartQuote(cart.isSuccess)
  const wallets = useWallets()
  const connection = useWalletConnection()
  const notice = useRealtimeNotice()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState<string | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [network, setNetwork] = useState<PaymentNetwork>('verde')
  const [review, setReview] = useState<{ quoteKey: string | null; acceptedKey: string | null }>({
    quoteKey: null,
    acceptedKey: null,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const create = useMutation({
    mutationFn: (attempt: { key: string; body: CreateOrderRequest }) => createOrder(attempt.body, attempt.key),
    onSuccess: (order) => {
      rememberVersion('order', order.id, order.version)
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => {
      if (isApiRequestError(error) && error.code === 'validation_error') setFieldErrors(error.fields)
      if (isApiRequestError(error) && error.status === 401) {
        markSessionExpired()
        clearSessionToken()
      }
      if (isApiRequestError(error) && (error.code === 'quote_stale' || error.code === 'availability_conflict')) {
        setReview((current) => ({ ...current, acceptedKey: null }))
        void queryClient.invalidateQueries({ queryKey: cartKeys.current })
        void queryClient.invalidateQueries({ queryKey: cartKeys.quote })
      }
      if (isApiRequestError(error) && error.code === 'idempotency_conflict') {
        clearOrderAttempt()
      }
    },
  })

  const buyerName = name ?? ''
  if (session.status === 'authenticated' && name === null) {
    setName(session.user.name)
  }

  const walletList = wallets.data?.wallets ?? []
  if (!walletId && walletList.length > 0) {
    const preferred = walletList.find((wallet) => wallet.connectedNetwork) ?? walletList.find((wallet) => wallet.role === 'primary') ?? walletList[0]
    setWalletId(preferred.id)
    if (preferred.connectedNetwork) setNetwork(preferred.connectedNetwork)
  }

  const quoteKey = quote.data && cart.data ? acknowledgementKey(quote.data, cart.data.items) : null
  useEffect(() => () => { submissionVersion.current += 1 }, [walletId, network, name, collector, provider, quoteKey, session.status])

  if (quoteKey && review.quoteKey !== quoteKey) {
    setReview({
      quoteKey,
      acceptedKey: review.quoteKey === null && quote.data?.issues.length === 0 ? quoteKey : review.acceptedKey,
    })
  }

  if (cart.isPending || wallets.isPending || session.status === 'loading') {
    return (
      <KurioScreen active="mercado">
        <h1 className="mb-6 text-[28px] leading-[37px] font-bold">Pagamento</h1>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="skeleton h-80 rounded-[6px]" />
          <div className="skeleton h-64 rounded-[6px]" />
        </div>
        <p className="sr-only">Carregando o pagamento.</p>
      </KurioScreen>
    )
  }

  if (cart.isError || wallets.isError || quote.isError) {
    return (
      <KurioScreen active="mercado">
        <h1 className="text-[28px] leading-[37px] font-bold">Pagamento</h1>
        <p role="alert">
          {isApiRequestError(cart.error)
            ? cart.error.message
            : isApiRequestError(wallets.error)
              ? wallets.error.message
              : isApiRequestError(quote.error)
                ? quote.error.message
                : 'Não foi possível carregar o pagamento.'}
        </p>
        <KurioButton
          type="button"
          className="h-10 px-4 text-sm font-bold"
          onClick={() => {
            void cart.refetch()
            void wallets.refetch()
            void quote.refetch()
          }}
        >
          Tentar de novo
        </KurioButton>
      </KurioScreen>
    )
  }

  const items = cart.data?.items ?? []
  const selected = walletList.find((wallet) => wallet.id === walletId) ?? null
  const connected = selected?.connectedNetwork === network
  const acknowledged = Boolean(quoteKey && review.acceptedKey === quoteKey && !quote.isFetching)
  const issues = quote.data?.issues ?? []
  const timeout = create.isError && isApiRequestError(create.error) && create.error.code === 'timeout'
  const createMessage =
    create.isError && isApiRequestError(create.error)
      ? (create.error.fields.buyerName ?? create.error.fields.walletId ?? create.error.message)
      : create.isError
        ? 'Não foi possível enviar o pedido.'
        : null

  function orderBody(): CreateOrderRequest | null {
    if (!quote.data || !selected) {
      return null
    }
    return {
      buyerName: buyerName.trim(),
      walletId: selected.id,
      network,
      collector: desktop ? { ...collector, email: session.user?.email ?? '', provider } : undefined,
      quote: {
        subtotalEth: quote.data.subtotalEth,
        discountEth: quote.data.discountEth,
        networkFeeEth: quote.data.networkFeeEth,
        totalEth: quote.data.totalEth,
        couponCode: quote.data.coupon?.code ?? null,
        items: items.map((item) => ({
          lineId: item.id,
          nftId: item.nftId,
          editionId: item.editionId,
          unitPriceEth: item.unitPriceEth,
          quantity: item.quantity,
        })),
      },
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || connection.isPending || create.isPending || quote.isFetching || quote.isError || cart.isFetching || cart.isError || wallets.isFetching || wallets.isError || issues.length > 0 || session.status !== 'authenticated') {
      return
    }

    const nextErrors: Record<string, string> = desktop ? validateCheckoutCollector({ ...collector, email: session.user?.email ?? '', provider }) : {}
    if (buyerName.trim().length < 2) {
      nextErrors.buyerName = 'Informe o nome com pelo menos 2 caracteres.'
    }
    if (!selected) {
      nextErrors.walletId = 'Escolha uma carteira.'
    }
    if (!acknowledged) {
      nextErrors.quote = 'Aceite a cotação atual antes de confirmar.'
    }
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const fieldIds: Record<string, string> = { buyerName: 'checkout-name', walletId: 'checkout-wallet', username: 'checkout-username', profileName: 'checkout-profile-name', referral: 'checkout-referral', ens: 'checkout-ens', email: 'checkout-email', provider: 'checkout-provider' }
      document.getElementById(fieldIds[Object.keys(nextErrors)[0]])?.focus()
      return
    }

    const body = orderBody()
    if (!body) {
      return
    }
    submitting.current = true
    const version = submissionVersion.current
    connection.reset()
    try {
      if (!connected) {
        await connection.mutateAsync({ walletId: body.walletId, body: { action: 'connect', network: body.network } })
      }
      if (submissionVersion.current !== version) {
        setFieldErrors({ walletId: 'Os dados mudaram durante a conexão. Revise e confirme novamente.' })
        return
      }
      await create.mutateAsync(saveOrderAttempt(body))
    } catch {
      // Mutation hooks expose connection and order failures through accessible alerts.
    } finally {
      submitting.current = false
    }
  }

  return (
    <div
      data-checkout-status={items.length === 0 ? 'empty' : 'ready'}
      data-wallet-status={connected ? 'connected' : 'disconnected'}
      data-checkout-ack={acknowledged ? 'current' : 'stale'}
      data-checkout-total={quote.data?.totalEth ?? ''}
    >
      {!desktop ? (
      <main className="relative mx-auto min-h-[896px] w-full max-w-[414px] overflow-hidden rounded-[40px] bg-[var(--kurio-ink)] px-7 pt-8 pb-9">
        <div className="flex h-11 -translate-y-8 items-center">
          <MobileBackButton to="/cart" />
          <h1 className="flex-1 text-center text-[18px] leading-[23px] font-bold">Pagamento com carteira</h1>
          <span className="size-[35px]" aria-hidden="true" />
        </div>
        <form
          className="mt-3"
          onSubmit={onSubmit}
        >
          {notice ? <p role="status" className="mb-3 text-sm" data-realtime-notice="">{notice}</p> : null}
          {items.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p>Não há itens para pagar.</p>
              <Link to="/" className="text-sm text-[var(--kurio-accent)]">Ver o catálogo</Link>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-bold">Carteira conectada</h2>
                <Link to="/wallets" className="text-[14px] text-[var(--kurio-accent)]">Trocar carteira</Link>
              </div>
              <fieldset
                id="checkout-wallet-mobile"
                className="flex flex-col gap-5"
                tabIndex={-1}
                data-checkout-wallets={walletList.length === 0 ? 'empty' : 'ready'}
              >
                <legend className="sr-only">Escolha uma carteira</legend>
                {walletList.length === 0 ? (
                  <p>Nenhuma carteira cadastrada. <Link to="/wallets" className="underline">Cadastrar carteira</Link></p>
                ) : (
                  walletList.map((wallet) => (
                    <label key={wallet.id} className="flex h-[93px] items-center gap-4 rounded-[14px] bg-[var(--kurio-card)] px-5 shadow-[0_7px_18px_rgba(10,6,4,.32)]">
                      <input
                        type="radio"
                        name="wallet-mobile"
                        value={wallet.id}
                        checked={wallet.id === walletId}
                        onChange={() => setWalletId(wallet.id)}
                        className="kurio-radio"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{wallet.label}</span>
                        <span className="block truncate text-[13px] text-[var(--kurio-secondary)]">{wallet.address}</span>
                        <span className="block text-[13px] text-[var(--kurio-secondary)]">
                          {wallet.connectedNetwork
                            ? paymentNetworks.find((item) => item.id === wallet.connectedNetwork)?.name
                            : 'Desconectada'}
                        </span>
                      </span>
                      <MoreVertical className="size-5 text-[var(--kurio-muted)]" aria-hidden="true" />
                    </label>
                  ))
                )}
              </fieldset>
              <fieldset className="mt-3 flex flex-col gap-4">
                <legend className="mb-2 text-base font-bold">Carteira e rede</legend>
                <ProviderOptions provider={provider} onChange={setProvider} mobile />
              </fieldset>
              <div className="absolute top-[680px] right-7 left-7 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs">Rede <select aria-label="Rede" className="bg-transparent" value={network} onChange={(event) => setNetwork(event.target.value as PaymentNetwork)}>{paymentNetworks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <p className="text-[13px] text-[var(--kurio-secondary)]">
                  {connected
                    ? `Conectada à ${paymentNetworks.find((item) => item.id === network)?.name}.`
                    : ''}
                </p>
                {selected && connected ? <button type="button" className="text-[13px] text-[var(--kurio-accent)]" disabled={connection.isPending || create.isPending} onClick={() => connection.mutate({ walletId: selected.id, body: { action: 'disconnect', network } })}>Desconectar</button> : null}
              </div>
              {connection.isError ? <p role="alert" className="mt-2 text-sm">{isApiRequestError(connection.error) ? connection.error.message : 'Não foi possível conectar.'}</p> : null}
              {fieldErrors.walletId ? <p role="alert" className="mt-2 text-sm">{fieldErrors.walletId}</p> : null}
              {!acknowledged && quote.data ? (
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <p role="alert">A cotação mudou.</p>
                  <button type="button" className="text-[var(--kurio-accent)]" onClick={() => setReview({ quoteKey, acceptedKey: quoteKey })}>Aceitar a cotação atual</button>
                </div>
              ) : null}
              {createMessage ? <p role="alert" className="mt-2 text-sm">{createMessage}</p> : null}
              <p className="mt-4 text-right text-[18px] font-bold">
                Total: <span className="ml-3 text-[var(--kurio-accent)]">{quote.data?.totalEth ?? '—'} ETH</span>
              </p>
              {timeout ? (
                <KurioButton
                  type="button"
                  className="absolute right-7 bottom-9 left-7 h-[60px] rounded-[30px] text-base font-bold"
                  disabled={create.isPending}
                  onClick={() => {
                    const attempt = readOrderAttempt()
                    if (attempt) create.mutate(attempt)
                  }}
                >
                  Recuperar o mesmo pedido
                </KurioButton>
              ) : (
                <KurioButton
                  type="submit"
                  className="absolute right-7 bottom-9 left-7 h-[60px] rounded-[30px] text-base font-bold"
                  disabled={!acknowledged || connection.isPending || issues.length > 0 || create.isPending || quote.isFetching || quote.isError || cart.isFetching || cart.isError || wallets.isFetching || wallets.isError || session.status !== 'authenticated'}
                >
                  {connection.isPending ? 'Conectando…' : create.isPending ? 'Enviando…' : 'Confirmar compra'}
                </KurioButton>
              )}
            </>
          )}
        </form>
      </main>
      ) : null}
      {desktop ? (
        <KurioScreen active="mercado">
          <h1 className="text-[15px] leading-4 font-bold"><Link to="/">Início</Link> / Mercado / Pagamento</h1>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,763px)_minmax(0,405px)]">
            <form id="checkout-form" className="flex flex-col gap-5 [&_label]:leading-4" onSubmit={onSubmit}>
              <h2 className="text-[18px] leading-4 font-bold">Perfil do colecionador</h2>
              <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                <TextField id="checkout-name" aria-required="true" label="Nome de exibição" requiredMark autoComplete="name" className={kurioFieldClass} value={buyerName} error={fieldErrors.buyerName} onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, buyerName: '' })) }} />
                <TextField id="checkout-username" aria-required="true" error={fieldErrors.username} label="Nome de usuário" requiredMark className={kurioFieldClass} value={collector.username ?? ''} onChange={(event) => setCollector({ ...collector, username: event.target.value })} />
                <label className="flex flex-col gap-1 text-[15px]"><span>Rede<span aria-hidden="true" className="ml-0.5 text-base text-[#d77849]">*</span></span><span className="relative"><select aria-required="true" aria-label="Rede" className={kurioFieldClass + ' w-full appearance-none border px-3 pr-9 !text-[var(--kurio-muted)]'} value={network} onChange={(event) => setNetwork(event.target.value as PaymentNetwork)}>{paymentNetworks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-[var(--kurio-muted)]" /></span></label>
                <TextField id="checkout-profile-name" aria-required="true" error={fieldErrors.profileName} label="Nome do perfil" requiredMark className={kurioFieldClass} value={collector.profileName ?? ''} onChange={(event) => setCollector({ ...collector, profileName: event.target.value })} />
                <label className="flex flex-col gap-1 text-[15px]"><span>Endereço da carteira<span aria-hidden="true" className="ml-0.5 text-base text-[#d77849]">*</span></span><span className="relative"><select aria-required="true" id="checkout-wallet" className={kurioFieldClass + ' w-full appearance-none border px-3 pr-9 !text-[var(--kurio-muted)]'} value={walletId ?? ''} onChange={(event) => setWalletId(event.target.value)}><option value="">Endereço 0x da carteira</option>{walletList.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.label} · {wallet.address}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-[var(--kurio-muted)]" /></span></label>
                <TextField id="checkout-secondary" label="Carteira secundária" labelClassName="sr-only" containerClassName="flex flex-col justify-end" placeholder="ENS ou carteira secundária (opcional)" className={kurioFieldClass} value={collector.secondaryAddress ?? ''} onChange={(event) => setCollector({ ...collector, secondaryAddress: event.target.value })} />
                <label className="flex flex-col gap-1 text-[15px]"><span>Tipo de carteira<span aria-hidden="true" className="ml-0.5 text-base text-[#d77849]">*</span></span><span className="relative"><select id="checkout-provider" aria-required="true" className={kurioFieldClass + ' w-full appearance-none border px-3 pr-9 !text-[var(--kurio-muted)]'} value={provider} onChange={(event) => setProvider(event.target.value)}>{providers.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-[var(--kurio-muted)]" /></span></label>
                <TextField id="checkout-referral" aria-required="true" error={fieldErrors.referral} label="Código de indicação" requiredMark className={kurioFieldClass} value={collector.referral ?? ''} onChange={(event) => setCollector({ ...collector, referral: event.target.value })} />
                <TextField id="checkout-email" aria-required="true" error={fieldErrors.email} label="E-mail" requiredMark type="email" className={kurioFieldClass} value={session.user?.email ?? ''} readOnly />
                <div className="flex flex-col gap-1.5"><label htmlFor="checkout-ens" className="text-[15px]">Nome ENS<span aria-hidden="true" className="ml-0.5 text-base text-[#d77849]">*</span></label><div className="flex gap-2"><select aria-label="Sufixo ENS" className={kurioFieldClass + ' w-[78px] border px-2'}><option>.eth</option></select><input id="checkout-ens" aria-required="true" aria-invalid={Boolean(fieldErrors.ens)} aria-describedby={fieldErrors.ens ? 'checkout-ens-error' : undefined} className={kurioFieldClass + ' min-w-0 flex-1 border px-3'} value={(collector.ens ?? '').replace(/\.eth$/, '')} onChange={(event) => setCollector({ ...collector, ens: event.target.value ? `${event.target.value}.eth` : '' })} /></div>{fieldErrors.ens ? <p id="checkout-ens-error" role="alert" className="text-sm text-destructive">{fieldErrors.ens}</p> : null}</div>
              </div>
              <label className="flex items-center gap-2 text-sm" data-checkout-wallets={walletList.length ? 'ready' : 'empty'}><input type="checkbox" className="kurio-radio" style={{ borderColor: 'var(--kurio-primary)' }} checked={selected?.role === 'secondary'} disabled={!walletList.some((wallet) => wallet.role === 'secondary')} onChange={(event) => setWalletId(walletList.find((wallet) => wallet.role === (event.target.checked ? 'secondary' : 'primary'))?.id ?? null)} />Usar outra carteira?</label>
              {walletList.length === 0 ? <Link to="/wallets" className="text-sm text-[var(--kurio-accent)]">Cadastrar carteira</Link> : null}
              <label className="flex max-w-[350px] flex-col gap-2 text-sm">Observação do colecionador (opcional)<textarea className="h-[152px] rounded border border-[var(--kurio-border)] bg-transparent p-3" value={collector.note ?? ''} onChange={(event) => setCollector({ ...collector, note: event.target.value })} /></label>
            </form>
            <aside className="relative flex flex-col gap-3">
              <h2 className="text-[18px] leading-4 font-bold">Seus NFTs</h2>
              <div className="flex justify-between border-b border-[var(--kurio-border-soft)] pb-[7px] text-base"><span>NFTs</span><span>Subtotal</span></div>
              <ul className="flex flex-col gap-3">{items.map((item) => <li key={item.id} className="flex h-[70px] items-center gap-3 bg-[var(--kurio-card)]" data-line-price={item.unitPriceEth}><img src={item.imageUrl} alt={item.imageAlt} className="size-[70px] rounded-[6px] object-cover" /><div className="min-w-0 flex-1"><h3 className="truncate text-base font-bold">{item.title}</h3><p className="text-sm text-[var(--kurio-muted)]">ID do token: #{item.title.split('#')[1]?.padStart(4, '0')}</p></div><span className="text-sm text-[var(--kurio-secondary)]">(× {item.quantity})</span><strong className="mr-3 shrink-0 text-lg text-[var(--kurio-accent)]">{item.lineTotalEth} ETH</strong></li>)}</ul>
              <Link to="/cart" className="text-center text-sm">Tem um código promocional? Aplique aqui</Link>
              {quote.data ? <dl className="grid grid-cols-2 gap-y-3 text-[15px]"><dt>Subtotal</dt><dd className="text-right">{quote.data.subtotalEth} ETH</dd><dt>Desconto do lançamento</dt><dd className="text-right">{quote.data.discountEth} ETH</dd><dt>Taxa de rede</dt><dd className="text-right">{quote.data.networkFeeEth} ETH</dd><dt className="border-t border-[var(--kurio-border-soft)] pt-3 font-bold">Total</dt><dd className="border-t border-[var(--kurio-border-soft)] pt-3 text-right text-lg font-bold text-[var(--kurio-accent)]">{quote.data.totalEth} ETH</dd></dl> : <div className="skeleton h-32" />}
              <h2 className="text-center text-[18px] leading-[23px] font-bold">Carteira e rede</h2>
              <ProviderOptions provider={provider} onChange={setProvider} />
              {selected && connected ? <button type="button" className="text-xs text-[var(--kurio-accent)]" disabled={connection.isPending || create.isPending} onClick={() => connection.mutate({ walletId: selected.id, body: { action: 'disconnect', network } })}>Desconectar</button> : null}
              {notice ? <p role="status" data-realtime-notice="">{notice}</p> : null}
              {connection.isError ? <p role="alert">{isApiRequestError(connection.error) ? connection.error.message : 'Não foi possível conectar.'}</p> : null}
              {fieldErrors.walletId ? <p role="alert">{fieldErrors.walletId}</p> : null}
              {issues.length ? <p role="alert">Ajuste as quantidades no carrinho antes de confirmar.</p> : null}
              {!acknowledged && quote.data ? <div><p role="alert">A cotação mudou.</p><button type="button" className="text-[var(--kurio-accent)]" onClick={() => setReview({ quoteKey, acceptedKey: quoteKey })}>Aceitar a cotação atual</button></div> : null}
              {createMessage ? <p role="alert">{createMessage}</p> : null}
              {timeout ? <KurioButton className="h-11 text-sm font-bold" onClick={() => { const attempt = readOrderAttempt(); if (attempt) create.mutate(attempt) }} disabled={create.isPending}>Recuperar o mesmo pedido</KurioButton> : <KurioButton type="submit" form="checkout-form" className="mt-3 h-[45px] text-sm font-bold" disabled={!acknowledged || connection.isPending || issues.length > 0 || create.isPending || quote.isFetching || quote.isError || cart.isFetching || cart.isError || wallets.isFetching || wallets.isError || session.status !== 'authenticated'}>{connection.isPending ? 'Conectando…' : create.isPending ? 'Enviando…' : 'Confirmar compra'}</KurioButton>}
              {!items.length ? <p>Não há itens para pagar.</p> : null}
            </aside>
          </div>
        </KurioScreen>
      ) : null}
    </div>
  )
}

const providers = ['WalletConnect', 'MetaMask', 'Coinbase Wallet']
function ProviderOptions({ provider, onChange, mobile = false }: { provider: string; onChange: (value: string) => void; mobile?: boolean }) {
  return <div className="flex flex-col gap-4">{providers.map((item, index) => <label key={item} aria-label={item} className={`flex items-center gap-3 px-3 text-sm ${mobile ? 'h-[65px] rounded-[15px] bg-[var(--kurio-card)]' : 'h-[45px] rounded border ' + (provider === item ? 'border-[var(--kurio-primary)]' : 'border-[var(--kurio-border)]')}`}>
    {mobile ? <span className="flex size-10 items-center justify-center rounded-full border border-[var(--kurio-border)] bg-[#2f1d15] text-[var(--kurio-accent)]">{index < 2 ? item[0] : <Wallet className="size-5" />}</span> : null}
    {!mobile ? <input type="radio" name="provider" style={{ borderColor: 'var(--kurio-primary)' }} aria-label={item} checked={provider === item} onChange={() => onChange(item)} className="kurio-radio" /> : null}
    {!mobile && index === 0 ? <span aria-hidden="true" className="max-w-full truncate whitespace-pre rounded-md border border-[var(--kurio-border-soft)] bg-[var(--kurio-dark)] px-1 py-1 text-[9px] font-bold text-[var(--kurio-accent)]">METAMASK  ·  WALLETCONNECT  ·  COINBASE</span> : <span className={index === 2 && !mobile ? 'ml-[25px] flex-1' : 'flex-1'}>{item}</span>}
    {mobile ? <input type="radio" name="provider-mobile" checked={provider === item} onChange={() => onChange(item)} className="kurio-radio" /> : null}
  </label>)}</div>
}
