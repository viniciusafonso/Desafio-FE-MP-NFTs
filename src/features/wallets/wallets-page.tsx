import { KurioSelect } from '@/features/home/kurio-select'
import { useState, type FormEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  networkName,
  validateWalletDraft,
  walletRoleName,
  walletExtraFields,
  type WalletDraft,
  type WalletRole,
  type WalletView,
} from '@/api/contracts/wallets'
import { isApiRequestError } from '@/api/errors'
import { AccountFrame } from '@/features/account/account-nav'
import { TextField } from '@/features/account/text-field'
import { KurioButton, kurioFieldClass } from '@/features/home/kurio-ui'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KurioScreen } from '@/features/home/kurio-screen'
import { useSaveWallet, useWallets } from '@/features/checkout/wallet-state'

const roles: WalletRole[] = ['primary', 'secondary']

export function WalletsPage() {
  const wallets = useWallets()
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [copyChoice, setSameAsPrimary] = useState<boolean | null>(null)

  if (wallets.isPending) {
    return (
      <KurioScreen active="inicio" account>
        <AccountFrame>
          <h1 className="mb-6 text-[17px] leading-5 font-bold">Carteiras</h1>
          <div className="flex flex-col gap-4">
            <div className="skeleton h-40 rounded-[6px]" />
            <div className="skeleton h-40 rounded-[6px]" />
          </div>
          <p className="sr-only">Carregando as carteiras.</p>
        </AccountFrame>
      </KurioScreen>
    )
  }

  if (wallets.isError) {
    const message = isApiRequestError(wallets.error) ? wallets.error.message : 'Não foi possível carregar as carteiras.'
    return (
      <KurioScreen active="inicio" account>
        <AccountFrame>
          <h1 className="text-[17px] leading-5 font-bold">Carteiras</h1>
          <p role="alert">{message}</p>
          <KurioButton type="button" className="h-10 px-4 text-sm font-bold" onClick={() => void wallets.refetch()}>
            Tentar de novo
          </KurioButton>
        </AccountFrame>
      </KurioScreen>
    )
  }

  const list = [...(wallets.data?.wallets ?? [])].sort((left, right) => left.role.localeCompare(right.role))
  const primary = list.find((wallet) => wallet.role === 'primary')
  const secondary = list.find((wallet) => wallet.role === 'secondary')
  const sameAsPrimary = copyChoice ?? secondary?.sameAsPrimary ?? false

  return (
    <KurioScreen active="inicio" account>
    <AccountFrame>
    <div className="flex w-full flex-col gap-8" data-wallets-status="ready">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[17px] leading-5 font-bold">Carteira principal</h1>
          {!primary ? <button type="button" className="text-sm text-[var(--kurio-accent)]" onClick={() => document.getElementById('new-primary-display-name')?.focus()}>Adicionar</button> : null}
        </div>
        <p className="text-sm text-[var(--kurio-secondary)]">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
        </p>
      </div>
      <div className="flex flex-col gap-6" data-wallet-count={list.length}>
        {primary ? <WalletEditor key={primary.id} wallet={primary} /> : <WalletCreateForm defaultRole="primary" />}
        <section className="mt-2 flex flex-col gap-2" aria-labelledby="secondary-wallet-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="secondary-wallet-heading" className="text-[17px] font-bold">Carteira secundária</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" className="kurio-radio" style={{ borderColor: 'var(--kurio-primary)' }} checked={sameAsPrimary} disabled={!primary}
                  onChange={(event) => setSameAsPrimary(event.target.checked)} />
                Igual à carteira principal
              </label>
              <button type="button" aria-expanded={secondaryOpen} aria-controls="secondary-wallet-editor"
                className="text-sm text-[var(--kurio-accent)]" onClick={() => setSecondaryOpen((open) => !open)}>
                {secondary ? 'Alterar' : 'Adicionar'}
              </button>
            </div>
          </div>
          <p className="text-sm text-[var(--kurio-secondary)]">{secondary ? `${secondary.label} · ${secondary.address}` : 'Você ainda não adicionou uma carteira secundária.'}</p>
          {secondaryOpen ? <div id="secondary-wallet-editor" className="mt-4">{secondary ? <WalletEditor key={`${secondary.id}-${sameAsPrimary ? JSON.stringify(primary) : 'manual'}`} wallet={secondary} copyFrom={sameAsPrimary ? primary : undefined} /> : <WalletCreateForm key={sameAsPrimary ? JSON.stringify(primary) : 'manual'} defaultRole="secondary" copyFrom={sameAsPrimary ? primary : undefined} />}</div> : null}
        </section>
      </div>
    </div>
    </AccountFrame>
    </KurioScreen>
  )
}

function WalletEditor({ wallet, copyFrom }: { wallet: WalletView; copyFrom?: WalletView }) {
  const save = useSaveWallet()
  const source = copyFrom ?? wallet
  const [draft, setDraft] = useState<WalletDraft>({
    ...Object.fromEntries(walletExtraFields.map((key) => [key, source[key] ?? ''])),
    label: source.label, address: source.address, role: wallet.role, sameAsPrimary: Boolean(copyFrom),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  return (
    <WalletForm
      copying={Boolean(copyFrom)}
      title={walletRoleName(wallet.role)}
      idPrefix={wallet.id}
      draft={draft}
      errors={errors}
      message={message}
      pending={save.isPending}
      connection={
        wallet.connectedNetwork ? `Conectada à ${networkName(wallet.connectedNetwork)}.` : 'Desconectada.'
      }
      onChange={setDraft}
      onSubmit={(event) => {
        event.preventDefault()
        const fields = validateWalletDraft(draft)
        setErrors(fields)
        setMessage(null)
        if (Object.keys(fields).length > 0) {
          focusWalletField(wallet.id, fields)
          return
        }
        save.mutate(
          { walletId: wallet.id, body: draft },
          {
            onSuccess: (wallet) => {
              setDraft({ ...Object.fromEntries(walletExtraFields.map((key) => [key, wallet[key] ?? ''])), label: wallet.label, address: wallet.address, role: wallet.role, sameAsPrimary: wallet.sameAsPrimary })
              setMessage('Carteira atualizada.')
            },
            onError: (error) => applyWalletError(error, setErrors, setMessage),
          },
        )
      }}
    />
  )
}

function WalletCreateForm({ defaultRole, copyFrom }: { defaultRole: WalletRole; copyFrom?: WalletView }) {
  const save = useSaveWallet()
  const [draft, setDraft] = useState<WalletDraft>({
    ...Object.fromEntries(walletExtraFields.map((key) => [key, copyFrom?.[key] ?? ''])),
    label: copyFrom?.label ?? '', address: copyFrom?.address ?? '', role: defaultRole,
    sameAsPrimary: Boolean(copyFrom),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  return (
    <WalletForm
      copying={Boolean(copyFrom)}
      title="Nova carteira"
      idPrefix={`new-${defaultRole}`}
      draft={draft}
      errors={errors}
      message={message}
      pending={save.isPending}
      submitLabel={save.isPending ? 'Salvando…' : 'Salvar carteira'}
      onChange={setDraft}
      onSubmit={(event) => {
        event.preventDefault()
        const fields = validateWalletDraft(draft)
        setErrors(fields)
        setMessage(null)
        if (Object.keys(fields).length > 0) {
          focusWalletField(`new-${defaultRole}`, fields)
          return
        }
        save.mutate(
          { body: draft },
          {
            onSuccess: (wallet) => {
              setDraft({ label: walletRoleName(defaultRole), address: '', role: defaultRole })
              setMessage(`Carteira ${wallet.label} cadastrada.`)
            },
            onError: (error) => applyWalletError(error, setErrors, setMessage),
          },
        )
      }}
    />
  )
}

function WalletForm({
  copying = false,
  title,
  idPrefix,
  draft,
  errors,
  message,
  pending,
  connection,
  submitLabel,
  onChange,
  onSubmit,
}: {
  copying?: boolean
  title: string
  idPrefix: string
  draft: WalletDraft
  errors: Record<string, string>
  message: string | null
  pending: boolean
  connection?: string
  submitLabel?: string
  onChange: (draft: WalletDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="grid gap-x-7 gap-y-6 md:grid-cols-2" onSubmit={onSubmit} noValidate data-wallet-role={draft.role}>
      <h2 className="sr-only">{title}</h2>
      <fieldset className="contents" disabled={copying}>
      <TextField error={errors.displayName} id={`${idPrefix}-display-name`} label="Nome de exibição" requiredMark className={kurioFieldClass} value={draft.displayName ?? ''} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} />

      <TextField
        id={`${idPrefix}-label`}
        label="Apelido da carteira"
        requiredMark
        className={kurioFieldClass}
        value={draft.label}
        error={errors.label}
        onChange={(event) => onChange({ ...draft, label: event.target.value })}
      />
      <KurioSelect error={errors.network} id={`${idPrefix}-network`} label="Rede" requiredMark value={draft.network ?? ''} placeholder="Selecione uma rede" options={['Ethereum', 'Polygon', 'Solana']} onValueChange={(network) => onChange({ ...draft, network })} />
      <TextField error={errors.profileName} id={`${idPrefix}-profile-name`} label="Nome do perfil" requiredMark className={kurioFieldClass} value={draft.profileName ?? ''} onChange={(event) => onChange({ ...draft, profileName: event.target.value })} />
      <TextField
        id={`${idPrefix}-address`}
        label="Endereço da carteira"
        requiredMark
        placeholder="Endereço 0x da carteira"
        className={kurioFieldClass}
        autoComplete="off"
        spellCheck={false}
        value={draft.address}
        error={errors.address}
        onChange={(event) => onChange({ ...draft, address: event.target.value })}
      />
      <TextField id={`${idPrefix}-secondary-address`} label="Carteira secundária" labelClassName="sr-only" containerClassName="flex flex-col justify-end" placeholder="ENS ou carteira secundária (opcional)" className={kurioFieldClass} value={draft.secondaryAddress ?? ''} onChange={(event) => onChange({ ...draft, secondaryAddress: event.target.value })} />
      <KurioSelect error={errors.provider} id={`${idPrefix}-provider`} label="Tipo de carteira" requiredMark value={draft.provider ?? ''} placeholder="Selecione uma carteira" options={['MetaMask', 'WalletConnect', 'Coinbase Wallet']} onValueChange={(provider) => onChange({ ...draft, provider })} />
      <TextField error={errors.referral} id={`${idPrefix}-referral`} label="Código de indicação" requiredMark className={kurioFieldClass} value={draft.referral ?? ''} onChange={(event) => onChange({ ...draft, referral: event.target.value })} />
      <TextField error={errors.email} id={`${idPrefix}-email`} label="E-mail" requiredMark type="email" className={kurioFieldClass} value={draft.email ?? ''} onChange={(event) => onChange({ ...draft, email: event.target.value })} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-ens`} className="gap-0">Nome ENS<span aria-hidden="true" className="ml-0.5 text-base leading-none text-[#d77849]">*</span></Label>
        <div className="flex gap-2.5">
          <div className="relative w-[70px] shrink-0">
            <select aria-label="Sufixo ENS" className="h-10 w-full appearance-none rounded-[6px] border border-[var(--kurio-border)] bg-transparent px-2 pr-6 text-sm" defaultValue=".eth"><option value=".eth">.eth</option></select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2" aria-hidden="true" />
          </div>
          <Input aria-required="true" aria-invalid={Boolean(errors.ens)} aria-describedby={errors.ens ? `${idPrefix}-ens-error` : undefined} id={`${idPrefix}-ens`} className={`${kurioFieldClass} min-w-0 flex-1`}
            value={(draft.ens ?? '').replace(/\.eth$/i, '')}
            onChange={(event) => { const name = event.target.value.replace(/\.eth$/i, ''); onChange({ ...draft, ens: name ? `${name}.eth` : '' }) }} />
        </div>
      </div>
      {errors.ens ? <p id={`${idPrefix}-ens-error`} role="alert" className="text-sm text-destructive">{errors.ens}</p> : null}
      <fieldset className="sr-only" id={`${idPrefix}-role`} tabIndex={-1}>
        <legend className="text-sm font-medium">Função</legend>
        {roles.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`${idPrefix}-role`}
              value={role}
              checked={draft.role === role}
              onChange={() => onChange({ ...draft, role })}
            />
            {walletRoleName(role)}
          </label>
        ))}
        {errors.role ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.role}
          </p>
        ) : null}
      </fieldset>
      </fieldset>
      {message ? (
        <p role="status" data-wallet-message="">
          {message}
        </p>
      ) : null}
      {connection ? <p className="sr-only">{connection}</p> : null}
      <KurioButton type="submit" className="h-10 w-fit px-4 text-sm font-bold" disabled={pending}>
        {submitLabel ?? (pending ? 'Salvando…' : 'Salvar carteira')}
      </KurioButton>
    </form>
  )
}

function focusWalletField(idPrefix: string, fields: Record<string, string>) {
  const suffixes: Record<string, string> = { displayName: 'display-name', profileName: 'profile-name' }
  const key = Object.keys(fields)[0]
  const target = `${idPrefix}-${suffixes[key] ?? key}`
  document.getElementById(target)?.focus()
}

function applyWalletError(
  error: unknown,
  setErrors: (fields: Record<string, string>) => void,
  setMessage: (message: string) => void,
) {
  if (!isApiRequestError(error)) {
    setMessage('Não foi possível salvar a carteira.')
    return
  }
  if (Object.keys(error.fields).length > 0) {
    setErrors(error.fields)
  }
  setMessage(error.message)
}
