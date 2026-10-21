import { validateEmail } from '@/api/contracts/session'

/** Collector fields shown by the desktop checkout. Mobile has no collector form. */
export function validateCheckoutCollector(collector: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [key, label] of Object.entries({ username: 'o nome de usuário', profileName: 'o nome do perfil', referral: 'o código de indicação' })) {
    if (!collector[key]?.trim()) errors[key] = `Informe ${label}.`
  }
  if (!collector.ens?.trim() || collector.ens.trim() === '.eth') errors.ens = 'Informe o nome ENS.'
  else if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.eth$/i.test(collector.ens.trim())) errors.ens = 'Informe um nome ENS válido terminado em .eth.'
  const emailError = validateEmail(collector.email ?? '')
  if (emailError) errors.email = emailError
  if (!['WalletConnect', 'MetaMask', 'Coinbase Wallet'].includes(collector.provider ?? '')) errors.provider = 'Escolha um tipo de carteira.'
  return errors
}
