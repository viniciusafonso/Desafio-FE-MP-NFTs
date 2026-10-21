import { http } from 'msw'
import {
  normalizeEmail,
  validateLogin,
  validateRegister,
  type LoginRequest,
  type RegisterRequest,
} from '@/api/contracts/session'
import {
  hashPassword,
  readScenario,
  updateSimulation,
  type MockSession,
  type MockUser,
} from '@/mocks/db'
import { beginScenario, readBearer, simulationError } from '@/mocks/http'

const sessionDurationMs = 1000 * 60 * 60 * 12

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readLoginBody(value: unknown): LoginRequest {
  if (!isRecord(value)) {
    return { email: '', password: '' }
  }

  return {
    email: typeof value.email === 'string' ? value.email : '',
    password: typeof value.password === 'string' ? value.password : '',
  }
}

function readRegisterBody(value: unknown): RegisterRequest {
  if (!isRecord(value)) {
    return { name: '', email: '', password: '' }
  }

  return {
    name: typeof value.name === 'string' ? value.name : '',
    email: typeof value.email === 'string' ? value.email : '',
    password: typeof value.password === 'string' ? value.password : '',
  }
}

function publicUser(user: MockUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarId: user.avatarId,
  }
}

function createSession(userId: string, now: number): MockSession {
  return {
    token: `ses_${crypto.randomUUID()}`,
    userId,
    expiresAt: new Date(now + sessionDurationMs).toISOString(),
  }
}

async function findActiveSession(token: string | null, now: number) {
  const found: { current: { user: MockUser; session: MockSession } | null } = { current: null }

  if (!token) {
    return null
  }

  await updateSimulation((state) => {
    const session = state.sessions.find((item) => item.token === token)
    if (!session || Date.parse(session.expiresAt) <= now) {
      return {
        ...state,
        sessions: state.sessions.filter((item) => item.token !== token),
      }
    }

    const user = state.users.find((item) => item.id === session.userId)
    if (!user) {
      return {
        ...state,
        sessions: state.sessions.filter((item) => item.token !== token),
      }
    }

    found.current = { user, session }
    return state
  })

  return found.current
}

export const sessionHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    const body = readRegisterBody(await request.json().catch(() => null))
    const fields = validateRegister(body)
    if (Object.keys(fields).length > 0) {
      return simulationError(422, 'validation_error', 'Revise os campos do cadastro.', fields)
    }

    const email = normalizeEmail(body.email)
    let response: Response | null = null

    await updateSimulation(async (state) => {
      if (scenario === 'register-conflict' || state.users.some((user) => user.email === email)) {
        response = simulationError(409, 'email_taken', 'Já existe uma conta com esse e-mail.', {
          email: 'Esse e-mail já está em uso.',
        })
        return state
      }

      const now = Date.now()
      const user: MockUser = {
        id: `usr_${crypto.randomUUID()}`,
        name: body.name.trim(),
        email,
        passwordHash: await hashPassword(body.password),
        avatarId: null,
        createdAt: new Date(now).toISOString(),
      }
      const session = createSession(user.id, now)
      response = Response.json(
        {
          token: session.token,
          expiresAt: session.expiresAt,
          user: publicUser(user),
        },
        { status: 201 },
      )

      return {
        ...state,
        users: [...state.users, user],
        sessions: [...state.sessions, session],
      }
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível criar a conta.')
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    const body = readLoginBody(await request.json().catch(() => null))
    const fields = validateLogin(body)
    if (Object.keys(fields).length > 0) {
      return simulationError(422, 'validation_error', 'Revise os campos de acesso.', fields)
    }

    const email = normalizeEmail(body.email)
    const passwordHash = await hashPassword(body.password)
    let response: Response | null = null

    await updateSimulation((state) => {
      const user = state.users.find((item) => item.email === email && item.passwordHash === passwordHash)
      if (!user) {
        response = simulationError(401, 'invalid_credentials', 'E-mail ou senha inválidos.')
        return state
      }

      const session = createSession(user.id, Date.now())
      response = Response.json({
        token: session.token,
        expiresAt: session.expiresAt,
        user: publicUser(user),
      })

      return {
        ...state,
        sessions: [...state.sessions, session],
      }
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível entrar.')
  }),

  http.get('/api/auth/session', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    if (scenario === 'session-expired') {
      return simulationError(401, 'session_expired', 'Sua sessão expirou.')
    }

    const active = await findActiveSession(readBearer(request), Date.now())
    if (!active) {
      return simulationError(401, 'session_expired', 'Sua sessão expirou.')
    }

    return Response.json({
      user: publicUser(active.user),
      expiresAt: active.session.expiresAt,
    })
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    const token = readBearer(request)
    await updateSimulation((state) => ({
      ...state,
      sessions: token ? state.sessions.filter((session) => session.token !== token) : state.sessions,
    }))

    return new Response(null, { status: 204 })
  }),
]
