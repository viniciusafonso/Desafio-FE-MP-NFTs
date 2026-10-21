import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProfileView, UpdateProfileRequest } from '@/api/contracts/profile'
import { normalizeEmail, type SessionView } from '@/api/contracts/session'
import { isApiRequestError } from '@/api/errors'
import { changePassword, getProfile, updateProfile } from '@/api/profile'
import { clearSessionToken, markSessionExpired } from '@/api/session-storage'
import { accountSessionKey } from '@/features/account/session'

export const profileKeys = {
  current: ['account', 'profile'] as const,
}

function expireIfNeeded(error: unknown) {
  if (isApiRequestError(error) && error.status === 401) {
    markSessionExpired()
    clearSessionToken()
  }
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.current,
    meta: { scope: 'private' },
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await getProfile(signal)
      } catch (error) {
        expireIfNeeded(error)
        throw error
      }
    },
  })
}

function writeProfile(queryClient: ReturnType<typeof useQueryClient>, profile: ProfileView) {
  queryClient.setQueryData(profileKeys.current, profile)
  queryClient.setQueryData<SessionView>(accountSessionKey, (current) => {
    if (!current) {
      return current
    }

    return {
      ...current,
      user: {
        ...current.user,
        name: profile.name,
        email: profile.email,
        avatarId: profile.avatarId,
      },
    }
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onMutate: async (input: UpdateProfileRequest) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.current })
      const previousProfile = queryClient.getQueryData<ProfileView>(profileKeys.current)
      const previousSession = queryClient.getQueryData<SessionView>(accountSessionKey)
      const name = input.name.trim()
      const email = normalizeEmail(input.email)
      if (previousProfile) {
        writeProfile(queryClient, { ...previousProfile, name, email, avatarId: input.avatarId })
      }
      return { previousProfile, previousSession }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(profileKeys.current, context?.previousProfile)
      queryClient.setQueryData(accountSessionKey, context?.previousSession)
    },
    onSuccess: (profile) => {
      writeProfile(queryClient, profile)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  })
}
