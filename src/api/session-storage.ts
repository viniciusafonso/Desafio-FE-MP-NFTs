import { isMockScenario, type MockScenario } from '@/api/contracts/scenarios'

export const sessionTokenKey = 'greenmint.session-token'
export const mockScenarioKey = 'greenmint.mock-scenario'
export const sessionNoticeKey = 'greenmint.session-notice'
export const guestCartKey = 'greenmint.guest-cart-id'

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function readSessionToken() {
  return localStorage.getItem(sessionTokenKey)
}

export function saveSessionToken(token: string) {
  localStorage.setItem(sessionTokenKey, token)
  emit()
}

export function clearSessionToken() {
  localStorage.removeItem(sessionTokenKey)
  emit()
}

export function subscribeSessionToken(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readGuestCartId() {
  return localStorage.getItem(guestCartKey)
}

export function ensureGuestCartId() {
  const current = readGuestCartId()
  if (current) {
    return current
  }

  const created = `gst_${crypto.randomUUID()}`
  localStorage.setItem(guestCartKey, created)
  return created
}

export function clearGuestCartId() {
  localStorage.removeItem(guestCartKey)
}

export function readMockScenario(): MockScenario | null {
  const value = localStorage.getItem(mockScenarioKey)
  return value && isMockScenario(value) ? value : null
}

export function markSessionExpired() {
  sessionStorage.setItem(sessionNoticeKey, 'expired')
}

export function readSessionNotice() {
  return sessionStorage.getItem(sessionNoticeKey)
}

export function clearSessionNotice() {
  sessionStorage.removeItem(sessionNoticeKey)
}
