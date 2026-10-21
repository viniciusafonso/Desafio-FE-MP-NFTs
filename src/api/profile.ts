import type { ChangePasswordRequest, ProfileView, UpdateProfileRequest } from '@/api/contracts/profile'
import { http } from '@/api/http'

export function getProfile(signal?: AbortSignal) {
  return http.get<ProfileView>('/profile', { signal }).then((response) => response.data)
}

export function updateProfile(body: UpdateProfileRequest) {
  return http.patch<ProfileView>('/profile', body).then((response) => response.data)
}

export function changePassword(body: ChangePasswordRequest) {
  return http.post('/profile/password', body).then(() => undefined)
}
