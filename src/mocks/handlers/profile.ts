import { http } from 'msw'
import { isAvatarId, validatePasswordChange, validateProfile } from '@/api/contracts/profile'
import { normalizeEmail } from '@/api/contracts/session'
import { requireCollector } from '@/mocks/access'
import { hashPassword, readScenario, updateSimulation, type MockUser } from '@/mocks/db'
import { beginScenario, simulationError } from '@/mocks/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function presentProfile(user: MockUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarId: isAvatarId(user.avatarId) ? user.avatarId : null,
    memberSince: user.createdAt,
    avatarUrl: user.avatarUrl ?? null,
    username: user.username ?? '', ens: user.ens ?? '', walletLabel: user.walletLabel ?? '',
  }
}

export const profileHandlers = [
  http.get('/api/profile', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    return Response.json(presentProfile(access.user))
  }),

  http.patch('/api/profile', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    const body = await request.json().catch(() => null)
    const input = {
      name: isRecord(body) && typeof body.name === 'string' ? body.name : '',
      email: isRecord(body) && typeof body.email === 'string' ? body.email : '',
      avatarId: isRecord(body) ? body.avatarId : undefined,
      ...Object.fromEntries(['username', 'ens', 'walletLabel'].map((key) => [key, isRecord(body) && typeof body[key] === 'string' ? body[key] : ''])),
    }
    const fields = validateProfile(input)
    if (Object.keys(fields).length > 0) {
      return simulationError(422, 'validation_error', 'Revise os dados do perfil.', fields)
    }

    const email = normalizeEmail(input.email)
    const avatarId = input.avatarId === null ? null : input.avatarId
    let response: Response | null = null

    await updateSimulation((state) => {
      const user = state.users.find((item) => item.id === access.user.id)
      if (!user) {
        response = simulationError(401, 'session_expired', 'Sua sessão expirou.')
        return state
      }

      if (state.users.some((item) => item.id !== user.id && item.email === email)) {
        response = simulationError(409, 'email_taken', 'Já existe uma conta com esse e-mail.', {
          email: 'Esse e-mail já está em uso.',
        })
        return state
      }

      if (isRecord(body)) {
        if (body.avatarUrl === null || (typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('data:image/png;base64,') && body.avatarUrl.length <= 2_800_000)) user.avatarUrl = body.avatarUrl
        for (const key of ['username', 'ens', 'walletLabel'] as const) {
          if (typeof body[key] === 'string') user[key] = body[key].trim().slice(0, 80)
        }
      }
      user.name = input.name.trim()
      user.email = email
      user.avatarId = isAvatarId(avatarId) ? avatarId : null
      response = Response.json(presentProfile(user))
      return state
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível atualizar o perfil.')
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const scenario = readScenario(request)
    const blocked = await beginScenario(scenario)
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    const body = await request.json().catch(() => null)
    const input = {
      currentPassword: isRecord(body) && typeof body.currentPassword === 'string' ? body.currentPassword : '',
      newPassword: isRecord(body) && typeof body.newPassword === 'string' ? body.newPassword : '',
    }
    const fields = validatePasswordChange(input)
    if (Object.keys(fields).length > 0) {
      return simulationError(422, 'validation_error', 'Revise a troca de senha.', fields)
    }

    if (scenario === 'password-rejected') {
      return simulationError(422, 'validation_error', 'A senha atual foi recusada neste cenário.', {
        currentPassword: 'A senha atual foi recusada neste cenário.',
      })
    }

    const currentHash = await hashPassword(input.currentPassword)
    const nextHash = await hashPassword(input.newPassword)
    let response: Response | null = null

    await updateSimulation((state) => {
      const user = state.users.find((item) => item.id === access.user.id)
      if (!user) {
        response = simulationError(401, 'session_expired', 'Sua sessão expirou.')
        return state
      }

      if (user.passwordHash !== currentHash) {
        response = simulationError(422, 'validation_error', 'A senha atual não confere.', {
          currentPassword: 'A senha atual não confere.',
        })
        return state
      }

      user.passwordHash = nextHash
      response = new Response(null, { status: 204 })
      return state
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível alterar a senha.')
  }),
]
