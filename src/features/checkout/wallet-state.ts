import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiRequestError } from '@/api/errors'
import { createWallet, listWallets, updateWallet, updateWalletConnection } from '@/api/wallets'
import type { WalletConnectionRequest, WalletDraft, WalletList, WalletView } from '@/api/contracts/wallets'
import { clearSessionToken, markSessionExpired } from '@/api/session-storage'

export const walletKeys = {
  list: ['wallets', 'list'] as const,
}

function expireIfNeeded(error: unknown) {
  if (isApiRequestError(error) && error.status === 401) {
    markSessionExpired()
    clearSessionToken()
  }
}

export function useWallets() {
  return useQuery({
    queryKey: walletKeys.list,
    meta: { scope: 'private' },
    queryFn: async ({ signal }) => {
      try {
        return await listWallets(signal)
      } catch (error) {
        expireIfNeeded(error)
        throw error
      }
    },
  })
}

export function useWalletConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ walletId, body }: { walletId: string; body: WalletConnectionRequest }) =>
      updateWalletConnection(walletId, body),
    onSuccess: (wallet) => {
      queryClient.setQueryData<WalletList>(walletKeys.list, (current) => {
        if (!current) {
          return current
        }

        return {
          wallets: current.wallets.map((item) => {
            if (item.id === wallet.id) {
              return wallet
            }
            if (wallet.connectedNetwork) {
              return { ...item, connectedNetwork: null }
            }
            return item
          }),
        }
      })
    },
  })
}

function replaceWallet(current: WalletList | undefined, wallet: WalletView) {
  if (!current) {
    return { wallets: [wallet] }
  }

  const exists = current.wallets.some((item) => item.id === wallet.id)
  return {
    wallets: exists ? current.wallets.map((item) => (item.id === wallet.id ? wallet : item)) : [...current.wallets, wallet],
  }
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ walletId, body }: { walletId?: string; body: WalletDraft }) =>
      walletId ? updateWallet(walletId, body) : createWallet(body),
    onSuccess: (wallet) => {
      queryClient.setQueryData<WalletList>(walletKeys.list, (current) => replaceWallet(current, wallet))
      void queryClient.invalidateQueries({ queryKey: walletKeys.list })
    },
  })
}
