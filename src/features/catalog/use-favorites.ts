import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFavorite, listFavorites, removeFavorite } from '@/api/catalog'
import type { FavoriteList } from '@/api/contracts/catalog'
import { isApiRequestError } from '@/api/errors'
import { clearSessionToken, markSessionExpired } from '@/api/session-storage'
import { useSession } from '@/features/account/use-session'
import { catalogKeys } from '@/features/catalog/queries'

export function useFavoriteState() {
  const session = useSession()
  const query = useQuery({
    queryKey: catalogKeys.favorites,
    meta: { scope: 'private' },
    enabled: session.status === 'authenticated',
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await listFavorites(signal)
      } catch (error) {
        if (isApiRequestError(error) && error.status === 401) {
          markSessionExpired()
          clearSessionToken()
        }
        throw error
      }
    },
  })

  return {
    session,
    ids: new Set(query.data?.nftIds ?? []),
    ready: session.status !== 'authenticated' || query.isSuccess,
  }
}

export function useToggleFavorite(nftId: string) {
  const queryClient = useQueryClient()
  const favorite = useFavoriteState()
  const mutation = useMutation({
    mutationKey: ['catalog', 'favorite', nftId],
    mutationFn: async (action: 'add' | 'remove') => {
      return action === 'remove' ? removeFavorite(nftId) : addFavorite(nftId)
    },
    onMutate: async (action) => {
      await queryClient.cancelQueries({ queryKey: catalogKeys.favorites })
      const previous = queryClient.getQueryData<FavoriteList>(catalogKeys.favorites)
      const nftIds = previous?.nftIds ?? []
      const next =
        action === 'remove' ? nftIds.filter((id) => id !== nftId) : [...nftIds.filter((id) => id !== nftId), nftId]
      queryClient.setQueryData<FavoriteList>(catalogKeys.favorites, { nftIds: next })
      return { previous }
    },
    onError: (_error, _nftId, context) => {
      queryClient.setQueryData(catalogKeys.favorites, context?.previous)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(catalogKeys.favorites, data)
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'list'] })
    },
  })

  return { ...favorite, saved: favorite.ids.has(nftId), mutation }
}
