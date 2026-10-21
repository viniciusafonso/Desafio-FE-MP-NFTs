import { http } from 'msw'
import type { CartView } from '@/api/contracts/cart'
import { readScenario, updateSimulation, type MockState, type MockUser } from '@/mocks/db'
import { couponFixtures } from '@/mocks/fixtures/coupons'
import { ensureCart, emptyQuote, presentCart, quoteCart, sellableQuantity } from '@/mocks/cart-view'
import { beginScenario, readBearer, simulationError } from '@/mocks/http'

const guestPattern = /^gst_[0-9a-f-]{36}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readQuantity(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : Number.NaN
}

async function resolveOwner(request: Request) {
  if (readScenario(request) === 'session-expired' && readBearer(request)) {
    return { response: simulationError(401, 'session_expired', 'Sua sessão expirou.') }
  }

  const token = readBearer(request)
  const found: { current: MockUser | null } = { current: null }
  const now = Date.now()

  if (token) {
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

    return { ownerId: found.current.id }
  }

  const guest = request.headers.get('x-guest-cart')
  if (guest && guestPattern.test(guest)) {
    return { ownerId: guest }
  }

  return { ownerId: null }
}

function cartOf(state: MockState, ownerId: string | null) {
  if (!ownerId) {
    return null
  }

  return state.carts.find((cart) => cart.ownerId === ownerId) ?? null
}

function viewOf(state: MockState, ownerId: string | null): CartView {
  return presentCart(state, cartOf(state, ownerId))
}

function editionOf(state: MockState, nftId: string, editionId: string) {
  const nft = state.nfts.find((item) => item.id === nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  return { nft, edition }
}

function availabilityError(available: number) {
  const label = available === 1 ? '1 unidade disponível' : `${available} unidades disponíveis`
  return simulationError(409, 'availability_conflict', `Essa edição tem ${label}.`, {
    quantity: `A quantidade máxima é ${available}.`,
  })
}

export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    let view: CartView = { items: [], couponCode: null }
    await updateSimulation((state) => {
      view = viewOf(state, owner.ownerId)
      return state
    })

    return Response.json(view)
  }),

  http.post('/api/quote', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    let quote = emptyQuote()
    await updateSimulation((state) => {
      quote = quoteCart(state, cartOf(state, owner.ownerId))
      return state
    })

    return Response.json(quote)
  }),

  http.post('/api/cart/adopt', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    if (!owner.ownerId || owner.ownerId.startsWith('gst_')) {
      return simulationError(401, 'unauthorized', 'Entre para guardar o carrinho na conta.')
    }

    const guest = request.headers.get('x-guest-cart')
    let view: CartView = { items: [], couponCode: null }
    await updateSimulation((state) => {
      const userCart = ensureCart(state, owner.ownerId as string)
      const guestCart = guest && guestPattern.test(guest) ? state.carts.find((cart) => cart.ownerId === guest) : undefined

      if (guestCart) {
        for (const line of guestCart.lines) {
          const { edition } = editionOf(state, line.nftId, line.editionId)
          if (!edition || edition.remaining === 0) {
            continue
          }

          const current = userCart.lines.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
          const combined = Math.min(edition.remaining, (current?.quantity ?? 0) + line.quantity)
          if (current) {
            current.quantity = combined
          } else if (combined > 0) {
            userCart.lines.push({ ...line, id: `line_${crypto.randomUUID()}`, quantity: combined })
          }
        }

        if (!userCart.couponCode && guestCart.couponCode) {
          userCart.couponCode = guestCart.couponCode
        }

        state.carts = state.carts.filter((cart) => cart.ownerId !== guest)
      }

      view = presentCart(state, userCart)
      return state
    })

    return Response.json(view)
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    if (!owner.ownerId) {
      return simulationError(422, 'validation_error', 'Não foi possível identificar o carrinho.')
    }

    const body = await request.json().catch(() => null)
    const nftId = isRecord(body) && typeof body.nftId === 'string' ? body.nftId : ''
    const editionId = isRecord(body) && typeof body.editionId === 'string' ? body.editionId : ''
    const quantity = isRecord(body) ? readQuantity(body.quantity) : Number.NaN
    if (!nftId || !editionId || quantity < 1) {
      return simulationError(422, 'validation_error', 'Revise a obra e a quantidade.', {
        quantity: 'Informe uma quantidade inteira maior que zero.',
      })
    }

    let response: Response | null = null
    await updateSimulation((state) => {
      const { nft, edition } = editionOf(state, nftId, editionId)
      if (!nft || !edition) {
        response = simulationError(404, 'not_found', 'Essa edição não existe.')
        return state
      }

      const cart = ensureCart(state, owner.ownerId as string)
      const ceiling = sellableQuantity(state, owner.ownerId, edition.id, edition.remaining)
      const current = cart.lines.find((line) => line.nftId === nftId && line.editionId === editionId)
      const nextQuantity = (current?.quantity ?? 0) + quantity
      if (ceiling <= 0 || nextQuantity > ceiling) {
        response = availabilityError(ceiling)
        return state
      }

      if (current) {
        current.quantity = nextQuantity
      } else {
        cart.lines.push({ id: `line_${crypto.randomUUID()}`, nftId, editionId, quantity })
      }

      response = Response.json(presentCart(state, cart))
      return state
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível atualizar o carrinho.')
  }),

  http.patch('/api/cart/items/:lineId', async ({ params, request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    const lineId = String(params.lineId)
    const body = await request.json().catch(() => null)
    const quantity = isRecord(body) ? readQuantity(body.quantity) : Number.NaN
    if (quantity < 1) {
      return simulationError(422, 'validation_error', 'Revise a quantidade.', {
        quantity: 'Informe uma quantidade inteira maior que zero.',
      })
    }

    let response: Response | null = null
    await updateSimulation((state) => {
      const cart = cartOf(state, owner.ownerId)
      const line = cart?.lines.find((item) => item.id === lineId)
      if (!cart || !line) {
        response = simulationError(404, 'not_found', 'Esse item não está no carrinho.')
        return state
      }

      const { edition } = editionOf(state, line.nftId, line.editionId)
      if (!edition) {
        response = simulationError(404, 'not_found', 'Essa edição não existe.')
        return state
      }

      const ceiling = sellableQuantity(state, owner.ownerId, edition.id, edition.remaining)
      if (quantity > ceiling) {
        response = availabilityError(ceiling)
        return state
      }

      line.quantity = quantity
      response = Response.json(presentCart(state, cart))
      return state
    })

    return response ?? simulationError(500, 'unexpected', 'Não foi possível atualizar o carrinho.')
  }),

  http.delete('/api/cart/items/:lineId', async ({ params, request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    const lineId = String(params.lineId)
    let view: CartView = { items: [], couponCode: null }
    await updateSimulation((state) => {
      const cart = cartOf(state, owner.ownerId)
      if (cart) {
        cart.lines = cart.lines.filter((line) => line.id !== lineId)
      }
      view = presentCart(state, cart)
      return state
    })

    return Response.json(view)
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    if (!owner.ownerId) {
      return simulationError(422, 'validation_error', 'Não foi possível identificar o carrinho.')
    }

    const body = await request.json().catch(() => null)
    const code = isRecord(body) && typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    const coupon = couponFixtures.find((item) => item.code === code)
    if (!coupon) {
      return simulationError(422, 'coupon_invalid', 'Cupom inválido.', {
        code: 'Esse cupom não existe.',
      })
    }

    if (Date.parse(coupon.expiresAt) <= Date.now()) {
      return simulationError(422, 'coupon_expired', 'Este cupom expirou.', {
        code: 'Este cupom expirou.',
      })
    }

    let view: CartView = { items: [], couponCode: null }
    await updateSimulation((state) => {
      const cart = ensureCart(state, owner.ownerId as string)
      cart.couponCode = coupon.code
      view = presentCart(state, cart)
      return state
    })

    return Response.json(view)
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    const blocked = await beginScenario(readScenario(request))
    if (blocked) {
      return blocked
    }

    const owner = await resolveOwner(request)
    if ('response' in owner) {
      return owner.response
    }

    let view: CartView = { items: [], couponCode: null }
    await updateSimulation((state) => {
      const cart = cartOf(state, owner.ownerId)
      if (cart) {
        cart.couponCode = null
      }
      view = presentCart(state, cart)
      return state
    })

    return Response.json(view)
  }),
]
