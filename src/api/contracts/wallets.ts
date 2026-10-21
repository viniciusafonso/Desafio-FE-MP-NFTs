import { validateEmail } from '@/api/contracts/session'
export const walletExtraFields = ["displayName", "profileName", "email", "ens", "referral", "provider", "network", "secondaryAddress"] as const
export type WalletDetails = Partial<Record<(typeof walletExtraFields)[number], string>>

export const paymentNetworks = [
  { id: 'verde', name: 'Ethereum' },
  { id: 'musgo', name: 'Polygon' },
] as const

export type PaymentNetwork = (typeof paymentNetworks)[number]['id']

export type WalletRole = 'primary' | 'secondary'

export type WalletView = WalletDetails & {
  id: string
  label: string
  role: WalletRole
  address: string
  connectedNetwork: PaymentNetwork | null
  sameAsPrimary?: boolean
}

export type WalletList = {
  wallets: WalletView[]
}

export type WalletConnectionRequest = {
  network: PaymentNetwork
  action: 'connect' | 'disconnect'
}

export function isPaymentNetwork(value: unknown): value is PaymentNetwork {
  return paymentNetworks.some((network) => network.id === value)
}

export function networkName(id: PaymentNetwork) {
  return paymentNetworks.find((network) => network.id === id)?.name ?? id
}

export type WalletDraft = WalletDetails & {
  sameAsPrimary?: boolean
  label: string
  address: string
  role: WalletRole
}

const walletAddressPattern = /^gm1[a-z0-9][a-z0-9-]{6,38}[a-z0-9]$/

export function normalizeWalletAddress(address: string) {
  return address.trim().toLowerCase()
}

export function walletRoleName(role: WalletRole) {
  return role === 'primary' ? 'Principal' : 'Secundária'
}

export function validateWalletDraft(input: WalletDraft) {
  const fields: Record<string, string> = {}
  const label = input.label.trim()

  if (label.length < 2 || label.length > 40) {
    fields.label = 'Informe um nome entre 2 e 40 caracteres.'
  }

  if (!walletAddressPattern.test(normalizeWalletAddress(input.address)) && !/^0x[0-9a-f]{40}$/i.test(input.address.trim()) && !/^[a-z0-9-]+\.eth$/i.test(input.address.trim())) {
    fields.address = 'Informe um endereço de carteira válido ou um nome .eth.'
  }

  if (input.role !== 'primary' && input.role !== 'secondary') {
    fields.role = 'Escolha a carteira principal ou a secundária.'
  }

  for (const [key, label] of Object.entries({ displayName: 'o nome de exibição', profileName: 'o nome do perfil', referral: 'o código de indicação' }) as [keyof WalletDetails, string][]) {
    if (!input[key]?.trim()) fields[key] = `Informe ${label}.`
  }
  if (!['Ethereum', 'Polygon', 'Solana'].includes(input.network ?? '')) fields.network = 'Escolha uma rede.'
  if (!['MetaMask', 'WalletConnect', 'Coinbase Wallet'].includes(input.provider ?? '')) fields.provider = 'Escolha um tipo de carteira.'
  const emailError = validateEmail(input.email ?? '')
  if (emailError) fields.email = emailError
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.eth$/i.test(input.ens?.trim() ?? '')) fields.ens = 'Informe um nome ENS válido terminado em .eth.'
  return fields
}
