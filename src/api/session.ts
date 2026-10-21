import type { AuthenticatedSession, LoginRequest, RegisterRequest, SessionView } from '@/api/contracts/session'
import { http } from '@/api/http'

export function login(input: LoginRequest) {
  return http.post<AuthenticatedSession>('/auth/login', input).then((response) => response.data)
}

export function register(input: RegisterRequest) {
  return http
    .post<AuthenticatedSession>('/auth/register', input)
    .then((response) => response.data)
}

export function getSession() {
  return http.get<SessionView>('/auth/session').then((response) => response.data)
}

export function logout() {
  return http.post('/auth/logout').then(() => undefined)
}
