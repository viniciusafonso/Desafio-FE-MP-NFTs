import { validateEmail } from '@/api/contracts/session'

export const avatarPresets = [
  { id: 'folha', label: 'Folha' },
  { id: 'musgo', label: 'Musgo' },
  { id: 'dossel', label: 'Dossel' },
  { id: 'orvalho', label: 'Orvalho' },
  { id: 'lua', label: 'Lua' },
] as const

export type AvatarId = (typeof avatarPresets)[number]['id']

export type ProfileView = {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  username?: string
  ens?: string
  walletLabel?: string
  avatarId: AvatarId | null
  memberSince: string
}

export type UpdateProfileRequest = {
  name: string
  email: string
  avatarUrl?: string | null
  username?: string
  ens?: string
  walletLabel?: string
  avatarId: AvatarId | null
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export function isAvatarId(value: unknown): value is AvatarId {
  return avatarPresets.some((preset) => preset.id === value)
}

export function validateProfile(input: { name: string; email: string; avatarId: unknown; username?: string; ens?: string; walletLabel?: string }) {
  const fields: Record<string, string> = {}
  const name = input.name.trim()

  if (name.length < 2 || name.length > 80) {
    fields.name = 'Informe o nome com 2 a 80 caracteres.'
  }

  const emailError = validateEmail(input.email)
  if (emailError) {
    fields.email = emailError
  }

  if (input.avatarId !== null && !isAvatarId(input.avatarId)) {
    fields.avatarId = 'Escolha uma marca do perfil.'
  }

  if (!input.username?.trim()) fields.username = 'Informe o nome de usuário.'
  if (!input.walletLabel?.trim()) fields.walletLabel = 'Informe o apelido da carteira.'
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.eth$/i.test(input.ens?.trim() ?? '')) fields.ens = 'Informe um nome ENS válido terminado em .eth.'
  return fields
}

export function validatePasswordChange(input: {
  currentPassword: string
  newPassword: string
  confirmPassword?: string
}) {
  const fields: Record<string, string> = {}

  if (!input.currentPassword) {
    fields.currentPassword = 'Informe a senha atual.'
  }

  if (input.newPassword.length < 8) {
    fields.newPassword = 'A nova senha precisa ter pelo menos 8 caracteres.'
  } else if (input.currentPassword && input.newPassword === input.currentPassword) {
    fields.newPassword = 'A nova senha precisa ser diferente da atual.'
  }

  if (input.confirmPassword !== undefined && input.confirmPassword !== input.newPassword) {
    fields.confirmPassword = 'A confirmação não corresponde à nova senha.'
  }

  return fields
}
