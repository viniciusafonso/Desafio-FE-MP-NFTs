export type SessionUser = {
  id: string
  name: string
  email: string
  avatarId: string | null
}

export type SessionView = {
  user: SessionUser
  expiresAt: string
}

export type AuthenticatedSession = SessionView & {
  token: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  name: string
  email: string
  password: string
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string) {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return 'Informe o e-mail.'
  }
  if (!emailPattern.test(normalized)) {
    return 'Informe um e-mail válido.'
  }
  return null
}

export function validateLogin(input: LoginRequest) {
  const fields: Record<string, string> = {}

  const emailError = validateEmail(input.email)
  if (emailError) {
    fields.email = emailError
  }

  if (!input.password) {
    fields.password = 'Informe a senha.'
  }

  return fields
}

export function validateRegister(input: RegisterRequest & { confirmPassword?: string }) {
  const fields: Record<string, string> = {}
  const name = input.name.trim()

  if (name.length < 2) {
    fields.name = 'Informe o nome com pelo menos 2 caracteres.'
  }

  Object.assign(fields, validateLogin({ email: input.email, password: input.password }))

  if (input.password && input.password.length < 8) {
    fields.password = 'A senha precisa ter pelo menos 8 caracteres.'
  }

  if (input.confirmPassword !== undefined && input.confirmPassword !== input.password) {
    fields.confirmPassword = 'A confirmação não corresponde à senha.'
  }

  return fields
}
