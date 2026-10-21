import { readBearer, simulationError } from '@/mocks/http'
import { readScenario, updateSimulation, type MockUser } from '@/mocks/db'

export async function requireCollector(request: Request) {
  if (readScenario(request) === 'session-expired' && readBearer(request)) {
    return { response: simulationError(401, 'session_expired', 'Sua sessão expirou.') }
  }

  const token = readBearer(request)
  if (!token) {
    return { response: simulationError(401, 'session_expired', 'Entre para continuar.') }
  }

  const found: { current: MockUser | null } = { current: null }
  const now = Date.now()

  await updateSimulation((state) => {
    const session = state.sessions.find((item) => item.token === token)
    if (!session || Date.parse(session.expiresAt) <= now) {
      return {
        ...state,
        sessions: state.sessions.filter((item) => item.token !== token),
      }
    }

    const user = state.users.find((item) => item.id === session.userId) ?? null
    found.current = user
    if (!user) {
      return {
        ...state,
        sessions: state.sessions.filter((item) => item.token !== token),
      }
    }

    return state
  })

  if (!found.current) {
    return { response: simulationError(401, 'session_expired', 'Sua sessão expirou.') }
  }

  return { user: found.current }
}
