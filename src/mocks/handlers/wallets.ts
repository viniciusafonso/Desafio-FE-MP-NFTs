import { http } from 'msw'
import {
  walletExtraFields,
  isPaymentNetwork,
  normalizeWalletAddress,
  validateWalletDraft,
  type WalletDraft,
  type WalletRole,
  type WalletView,
} from '@/api/contracts/wallets'
import { requireCollector } from '@/mocks/access'
import { readScenario, updateSimulation, type MockState } from '@/mocks/db'
import { beginScenario, simulationError } from '@/mocks/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function presentWallet(wallet: {
  id: string
  label: string
  role: 'primary' | 'secondary'
  address: string
  connectedNetwork: WalletView['connectedNetwork']
  sameAsPrimary?: boolean
} & import('@/api/contracts/wallets').WalletDetails): WalletView {
  return {
    ...Object.fromEntries(walletExtraFields.map((key) => [key, wallet[key] ?? ''])),
    id: wallet.id,
    label: wallet.label,
    role: wallet.role,
    address: wallet.address,
    connectedNetwork: wallet.connectedNetwork,
    sameAsPrimary: wallet.sameAsPrimary ?? false,
  }
}

function readDraft(value: unknown): import('@/api/contracts/wallets').WalletDraft {
  if (!isRecord(value)) {
    return { label: '', address: '', role: '' as WalletRole }
  }

  return {
    ...Object.fromEntries(walletExtraFields.map((key) => [key, typeof value[key] === 'string' ? value[key].trim().slice(0, 120) : ''])),
    sameAsPrimary: value.sameAsPrimary === true,
    label: typeof value.label === 'string' ? value.label : '',
    address: typeof value.address === 'string' ? value.address : '',
    role: value.role === 'primary' || value.role === 'secondary' ? value.role : ('' as WalletRole),
  }
}

function roleConflict(role: WalletRole) {
  const name = role === 'primary' ? 'principal' : 'secundária'
  return simulationError(409, 'wallet_role_taken', `Esta conta já tem uma carteira ${name}.`, {
    role: `Já existe uma carteira ${name}.`,
  })
}

function copyPrimaryDetails(draft: WalletDraft, state: MockState, userId: string) {
  if (!draft.sameAsPrimary) return null
  const primary = state.wallets.find((wallet) => wallet.userId === userId && wallet.role === 'primary')
  if (draft.role !== 'secondary' || !primary) {
    return simulationError(422, 'primary_required', 'Cadastre a carteira principal antes de reutilizar os dados.')
  }
  for (const key of walletExtraFields) draft[key] = primary[key] ?? ''
  draft.label = primary.label
  draft.address = primary.address
  return null
}

function addressTaken(state: MockState, draft: WalletDraft, userId: string, walletId?: string) {
  const address = normalizeWalletAddress(draft.address)
  return state.wallets.some((wallet) => {
    if (wallet.id === walletId || normalizeWalletAddress(wallet.address) !== address) return false
    if (wallet.userId !== userId) return true
    if (draft.role === 'secondary' && draft.sameAsPrimary && wallet.role === 'primary') return false
    if (draft.role === 'primary' && wallet.role === 'secondary' && wallet.sameAsPrimary) return false
    return true
  })
}

export const walletHandlers = [
  http.get('/api/wallets', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    let wallets: WalletView[] = []
    await updateSimulation((state) => {
      wallets = state.wallets.filter((wallet) => wallet.userId === access.user.id).map(presentWallet)
      return state
    })

    return Response.json({ wallets })
  }),

  http.post('/api/wallets', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    const draft = readDraft(await request.json().catch(() => null))
    let response: Response | null = null
    await updateSimulation((state) => {
      const copyError = copyPrimaryDetails(draft, state, access.user.id)
      if (copyError) { response = copyError; return state }
      const fields = validateWalletDraft(draft)
      if (Object.keys(fields).length) { response = simulationError(422, 'validation_error', 'Revise a carteira.', fields); return state }
      if (state.wallets.some((wallet) => wallet.userId === access.user.id && wallet.role === draft.role)) {
        response = roleConflict(draft.role)
        return state
      }
      if (addressTaken(state, draft, access.user.id)) {
        response = simulationError(409, 'address_taken', 'Esse endereço já está em outra carteira.', { address: 'Esse endereço já está em uso.' })
        return state
      }
      const wallet = {
        id: `wal_${crypto.randomUUID()}`,
        userId: access.user.id,
        ...Object.fromEntries(walletExtraFields.map((key) => [key, draft[key] ?? ''])),
        label: draft.label.trim(), role: draft.role,
        address: normalizeWalletAddress(draft.address),
        sameAsPrimary: draft.role === 'secondary' && draft.sameAsPrimary === true,
        connectedNetwork: null,
      }
      state.wallets.push(wallet)
      response = Response.json(presentWallet(wallet), { status: 201 })
      return state
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível cadastrar a carteira.')
  }),

  http.patch('/api/wallets/:walletId', async ({ params, request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const access = await requireCollector(request)
    if ('response' in access) {
      return access.response
    }

    const draft = readDraft(await request.json().catch(() => null))
    const walletId = String(params.walletId)
    let response: Response | null = null
    await updateSimulation((state) => {
      const wallet = state.wallets.find((item) => item.id === walletId && item.userId === access.user.id)
      if (!wallet) { response = simulationError(404, 'not_found', 'Essa carteira não está na sua conta.'); return state }
      const copyError = copyPrimaryDetails(draft, state, access.user.id)
      if (copyError) { response = copyError; return state }
      const fields = validateWalletDraft(draft)
      if (Object.keys(fields).length) { response = simulationError(422, 'validation_error', 'Revise a carteira.', fields); return state }
      if (state.wallets.some((item) => item.userId === access.user.id && item.role === draft.role && item.id !== wallet.id)) {
        response = roleConflict(draft.role)
        return state
      }
      if (addressTaken(state, draft, access.user.id, wallet.id)) {
        response = simulationError(409, 'address_taken', 'Esse endereço já está em outra carteira.', { address: 'Esse endereço já está em uso.' })
        return state
      }
      for (const key of walletExtraFields) wallet[key] = draft[key] ?? ''
      wallet.label = draft.label.trim()
      wallet.role = draft.role
      wallet.address = normalizeWalletAddress(draft.address)
      wallet.sameAsPrimary = draft.role === 'secondary' && draft.sameAsPrimary === true
      if (wallet.role === 'primary') {
        for (const secondary of state.wallets.filter((item) => item.userId === access.user.id && item.role === 'secondary' && item.sameAsPrimary)) {
          for (const key of walletExtraFields) secondary[key] = wallet[key] ?? ''
          secondary.label = wallet.label
          secondary.address = wallet.address
        }
      }
      response = Response.json(presentWallet(wallet))
      return state
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível atualizar a carteira.')
  }),

  http.post('/api/wallets/:walletId/connection', async ({ params, request }) => {
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
    const action = isRecord(body) && (body.action === 'connect' || body.action === 'disconnect') ? body.action : null
    const network = isRecord(body) && isPaymentNetwork(body.network) ? body.network : null
    if (!action || (action === 'connect' && !network)) {
      return simulationError(422, 'validation_error', 'Escolha a rede para conectar a carteira.', {
        network: 'Selecione uma rede.',
      })
    }

    if (action === 'connect' && scenario === 'wallet-refused') {
      return simulationError(422, 'wallet_refused', 'A carteira recusou a conexão simulada.', {
        walletId: 'A conexão foi recusada.',
      })
    }

    const walletId = String(params.walletId)
    let response: Response | null = null
    await updateSimulation((state) => {
      const wallet = state.wallets.find((item) => item.id === walletId && item.userId === access.user.id)
      if (!wallet) {
        response = simulationError(404, 'not_found', 'Essa carteira não está na sua conta.')
        return state
      }

      if (action === 'disconnect') {
        wallet.connectedNetwork = null
      } else if (network) {
        for (const item of state.wallets) {
          if (item.userId === access.user.id) {
            item.connectedNetwork = null
          }
        }
        wallet.connectedNetwork = network
      }

      response = Response.json(presentWallet(wallet))
      return state
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível atualizar a conexão.')
  }),
]
