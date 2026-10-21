import { delay, HttpResponse } from 'msw'
import type { MockScenario } from '@/api/contracts/scenarios'

export function simulationError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        fields,
      },
    },
    { status },
  )
}

export async function beginScenario(scenario: MockScenario) {
  if (scenario === 'network-failure') return HttpResponse.error()
  if (scenario === 'slow') {
    await delay(1200)
  }

  if (scenario === 'unavailable') {
    return simulationError(503, 'unavailable', 'A simulação está indisponível no momento.')
  }

  return null
}

export function readBearer(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) {
    return null
  }

  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}
