import type { WalletConnectionRequest, WalletDraft, WalletList, WalletView } from '@/api/contracts/wallets'
import { http } from '@/api/http'

export async function listWallets(signal?: AbortSignal) {
  const response = await http.get<WalletList>('/wallets', { signal })
  return response.data
}

export async function createWallet(body: WalletDraft) {
  const response = await http.post<WalletView>('/wallets', body)
  return response.data
}

export async function updateWallet(walletId: string, body: WalletDraft) {
  const response = await http.patch<WalletView>(`/wallets/${walletId}`, body)
  return response.data
}

export async function updateWalletConnection(walletId: string, body: WalletConnectionRequest) {
  const response = await http.post<WalletView>(`/wallets/${walletId}/connection`, body)
  return response.data
}
