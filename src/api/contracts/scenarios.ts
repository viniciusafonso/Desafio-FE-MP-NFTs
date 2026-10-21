export const mockScenarios = [
  'default',
  'slow',
  'unavailable',
  'network-failure',
  'session-expired',
  'register-conflict',
  'out-of-order',
  'favorite-failure',
  'wallet-refused',
  'password-rejected',
  'price-changed',
  'payment-refused',
  'payment-timeout',
  'payment-hold',
] as const

export type MockScenario = (typeof mockScenarios)[number]

export function isMockScenario(value: string): value is MockScenario {
  return mockScenarios.includes(value as MockScenario)
}
