import { X } from 'lucide-react'
import type { OrderReceipt } from '@/api/contracts/orders'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { clearOrderAttempt } from '@/api/checkout-attempt'
import { isApiRequestError } from '@/api/errors'
import { KurioButton, kurioPanelClass } from '@/features/home/kurio-ui'
import { KurioScreen } from '@/features/home/kurio-screen'
import { useOrder } from '@/features/orders/order-state'

const statusLabel = {
  pending: 'Processando',
  confirmed: 'Confirmado',
  refused: 'Recusado',
} as const

export function OrderPage({ orderId }: { orderId: string }) {
  const order = useOrder(orderId)

  useEffect(() => {
    if (order.data && order.data.status !== 'pending') {
      clearOrderAttempt()
    }
  }, [order.data])

  if (order.isPending) {
    return (
      <KurioScreen active="mercado">
        <h1 className="mb-6 text-[28px] leading-[37px] font-bold">Pedido</h1>
        <div className="skeleton h-64 rounded-[6px]" />
        <p className="sr-only">Carregando o pedido.</p>
      </KurioScreen>
    )
  }

  if (order.isError) {
    const missing = isApiRequestError(order.error) && order.error.status === 404
    return (
      <KurioScreen active="mercado">
        <h1 className="text-[28px] leading-[37px] font-bold">Pedido</h1>
        <p role="alert">{missing ? 'Pedido não encontrado.' : isApiRequestError(order.error) ? order.error.message : 'Não foi possível carregar o pedido.'}</p>
        {missing ? null : (
          <KurioButton type="button" className="h-10 px-4 text-sm font-bold" onClick={() => void order.refetch()}>
            Tentar de novo
          </KurioButton>
        )}
      </KurioScreen>
    )
  }

  const receipt = order.data
  const confirmed = receipt.status === 'confirmed'

  if (confirmed) return <ConfirmedReceipt receipt={receipt} />

  return (
    <KurioScreen active="mercado">
    <article
      className={`flex w-full max-w-3xl flex-col gap-4 ${kurioPanelClass}`}
      data-order-id={receipt.id}
      data-order-status={receipt.status}
      data-order-total={receipt.totalEth}
    >
        <h1 className="text-[28px] leading-[37px] font-bold">
          {confirmed ? 'Seus NFTs agora estão na sua carteira' : receipt.status === 'refused' ? 'Pagamento recusado' : 'Pagamento em processamento'}
        </h1>
        {confirmed ? <p className="text-sm tracking-[0.2em] text-[var(--kurio-accent)]">THANK YOU</p> : null}
      <p role="status">
        {receipt.status === 'pending'
          ? 'O pagamento ainda está em processamento. A confirmação aparece quando a simulação concluir.'
          : receipt.status === 'refused'
            ? 'O pagamento foi recusado. Os itens continuam no carrinho.'
            : `Status: ${statusLabel[receipt.status]}.`}
      </p>
      {receipt.refusalReason ? <p>{receipt.refusalReason}</p> : null}
      <p>
        {receipt.buyerName} · {receipt.buyerEmail}
      </p>
      <p>
        {receipt.walletLabel} · {receipt.walletAddress} · {receipt.networkName}
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {receipt.items.map((item) => (
          <li key={`${item.nftId}-${item.editionId}`}>
            {item.title} · {item.editionName} · {item.quantity} × {item.unitPriceEth} ETH = {item.lineTotalEth} ETH
          </li>
        ))}
      </ul>
      <p>Subtotal: {receipt.subtotalEth} ETH</p>
      <p>
        Desconto{receipt.couponCode ? ` (${receipt.couponCode}${receipt.couponPercent ? `, ${receipt.couponPercent}%` : ''})` : ''}: {receipt.discountEth} ETH
      </p>
      <p>Taxa de rede: {receipt.networkFeeEth} ETH</p>
      <p className="font-semibold">Total: {receipt.totalEth} ETH</p>
      {confirmed && receipt.transactionRef ? (
        <div className="grid gap-3 text-sm sm:grid-cols-2" data-transaction-ref={receipt.transactionRef}>
          <p>ID da transação: {receipt.transactionRef}</p>
          <p>Data: {receipt.createdAt}</p>
          <p>Total: {receipt.totalEth} ETH</p>
          <p>Carteira: {receipt.walletLabel}</p>
          <button
            type="button"
            className="w-fit text-sm text-[var(--kurio-accent)]"
            onClick={(event) => {
              const target = event.currentTarget.nextElementSibling
              if (target instanceof HTMLElement) {
                target.hidden = false
              }
            }}
          >
            Ver no Etherscan
          </button>
          <p hidden>Não há um explorador de rede. Esta referência existe só dentro da simulação.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {receipt.status === 'refused' ? (
        <Link to="/cart" className="inline-flex h-10 items-center rounded-[var(--kurio-radius)] bg-[var(--kurio-primary)] px-4 text-sm font-bold text-[var(--kurio-ink)]">
          Voltar ao carrinho
        </Link>
        ) : null}
        <Link to="/" className="text-sm text-[var(--kurio-accent)] underline-offset-4 hover:underline">
          Ver o catálogo
        </Link>
      </div>
    </article>
    </KurioScreen>
  )
}

function ConfirmedReceipt({ receipt }: { receipt: OrderReceipt }) {
  const [notice, setNotice] = useState(false)
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(receipt.createdAt)).replace(' de ', ' ').replace(' de ', ', ')
  return (
    <main className="mx-auto min-h-[1657px] w-full max-w-[1440px] px-6 pt-10 lg:pt-[166px]">
      <article className="relative mx-auto w-full max-w-[578px] border-b-[10px] border-[var(--kurio-primary)] bg-[var(--kurio-card)] pb-12"
        data-order-id={receipt.id} data-order-status={receipt.status} data-order-total={receipt.totalEth}>
        <Link to="/" aria-label="Fechar recibo" className="absolute top-4 right-4 text-[var(--kurio-primary)]"><X className="size-5" /></Link>
        <header className="flex flex-col items-center gap-4 px-6 pt-[22px] pb-[18px] text-center">
          <svg width="66" height="80" viewBox="0 0 66 80" className="text-[var(--kurio-primary)]" aria-label="Thank you" role="img"><g fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 25 2 32v44q0 2 2 2h58q2 0 2-2V32l-5-7M7 41V8q0-2 2-2h48q2 0 2 2v33M2 32l19 21m43-21L45 53M2 76l26-28q5-5 10 0l26 28" /><path d="M24 6Q33-5 42 6" /></g><text x="12" y="26" fill="currentColor" fontSize="12" fontWeight="700">THANK</text><text x="19" y="39" fill="currentColor" fontSize="12" fontWeight="700">YOU</text></svg>
          <h1 className="text-base leading-5 font-bold text-[var(--kurio-secondary)]">Seus NFTs agora estão na sua carteira</h1>
        </header>
        <dl data-receipt-metadata="" className="grid grid-cols-2 gap-4 border-y border-[var(--kurio-primary)] px-9 py-[13px] text-sm leading-5 text-[var(--kurio-secondary)] sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,.72fr)] [&>div]:min-w-0 sm:gap-0 sm:[&>div+div]:border-l sm:[&>div+div]:border-[var(--kurio-primary)] sm:[&>div+div]:pl-4 sm:[&>div]:pr-3 sm:[&>div:last-child]:pr-0 [&_dt]:truncate [&_dd]:truncate">
          <div className="min-w-0"><dt className="font-bold">ID da transação</dt><dd className="truncate" data-transaction-ref={receipt.transactionRef ?? ''}>{receipt.transactionRef}</dd></div>
          <div><dt>Data</dt><dd title={date}>{date}</dd></div>
          <div><dt>Total</dt><dd>{receipt.totalEth} ETH</dd></div>
          <div><dt className="font-bold">Carteira</dt><dd title={receipt.walletLabel}>{receipt.walletLabel}</dd></div>
        </dl>
        <div className="px-6 pt-5 sm:px-11">
          <h2 className="text-sm font-bold">Detalhes da transação</h2>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_70px_100px] border-b border-[var(--kurio-border-soft)] pb-2 text-base"><span>NFTs</span><span>Edições</span><span className="text-right">Subtotal</span></div>
          <ul className="mt-3 flex flex-col gap-3">
            {receipt.items.map((item) => <li key={`${item.nftId}-${item.editionId}`} className="grid grid-cols-[minmax(0,1fr)_70px_100px] items-center gap-1">
              <div className="flex min-w-0 items-center gap-3"><img src={item.imageUrl} alt={item.imageAlt} className="size-[70px] rounded-[6px] object-cover" /><div className="min-w-0"><h3 className="text-base font-bold">{item.title}</h3><p className="text-sm text-[var(--kurio-muted)]">ID do token: #{item.title.split('#')[1]?.padStart(4, '0')}</p></div></div>
              <span className="text-sm text-[var(--kurio-secondary)]">(× {item.quantity})</span><strong className="text-right text-lg text-[var(--kurio-accent)]">{item.lineTotalEth} ETH</strong>
            </li>)}
          </ul>
          <dl className="mt-4 ml-auto grid max-w-[322px] grid-cols-2 gap-y-2 text-base">
            {receipt.discountEth !== '0' ? <><dt>Desconto</dt><dd className="text-right">{receipt.discountEth} ETH</dd></> : null}
            <dt>Taxa de rede</dt><dd className="text-right">{receipt.networkFeeEth} ETH</dd><dt className="font-bold">Total</dt><dd className="text-right text-lg font-bold text-[var(--kurio-accent)]">{receipt.totalEth} ETH</dd>
          </dl>
          <div className="mt-2 border-t border-[var(--kurio-border-soft)] pt-3 text-center">
            <p className="text-sm leading-[22px] text-[var(--kurio-secondary)]">Transação confirmada na {receipt.networkName}. A propriedade foi transferida para sua carteira conectada e registrada na simulação.</p>
            <KurioButton className="mt-5 h-12 px-4 text-base font-bold" onClick={() => setNotice(true)}>Ver no Etherscan</KurioButton>
            {notice ? <p role="status" className="mt-3 text-sm">Esta transação é simulada e não existe em um explorador público.</p> : null}
          </div>
        </div>
      </article>
    </main>
  )
}
