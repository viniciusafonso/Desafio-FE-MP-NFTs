import { parseEthMinor } from '@/api/contracts/money'
import type { NftUpdatedEvent } from '@/api/contracts/realtime'
import { updateSimulation } from '@/mocks/db'
import { nftUpdatedEvent } from '@/mocks/place-order'
import { emitNftUpdated } from '@/mocks/realtime-hub'
import { simulationError } from '@/mocks/http'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export async function shiftCatalogNft(value: unknown) {
  if (!isRecord(value) || typeof value.nftId !== 'string' || typeof value.editionId !== 'string') {
    return simulationError(422, 'validation_error', 'Informe a obra e a edição.')
  }

  const priceEth = typeof value.priceEth === 'string' ? value.priceEth : null
  const remaining = typeof value.remaining === 'number' && Number.isInteger(value.remaining) ? value.remaining : null
  const duplicate = value.duplicate === true
  const stalePriceEth = typeof value.stalePriceEth === 'string' ? value.stalePriceEth : null

  if (priceEth) {
    try {
      parseEthMinor(priceEth)
    } catch {
      return simulationError(422, 'validation_error', 'O preço precisa ser uma string decimal em ETH.')
    }
  }

  if (stalePriceEth) {
    try {
      parseEthMinor(stalePriceEth)
    } catch {
      return simulationError(422, 'validation_error', 'O preço antigo precisa ser uma string decimal em ETH.')
    }
  }

  let event: NftUpdatedEvent | null = null
  let response: Response | null = null
  await updateSimulation((state) => {
    const nft = state.nfts.find((item) => item.id === value.nftId)
    const edition = nft?.editions.find((item) => item.id === value.editionId)
    if (!nft || !edition) {
      response = simulationError(404, 'not_found', 'Essa edição não existe.')
      return state
    }

    if (priceEth) {
      edition.priceEth = priceEth
    }
    if (remaining !== null) {
      if (remaining < 0 || remaining > edition.total) {
        response = simulationError(422, 'validation_error', 'A disponibilidade precisa ficar entre zero e o total da edição.')
        return state
      }
      edition.remaining = remaining
    }

    nft.version = (nft.version ?? 1) + 1
    event = nftUpdatedEvent(nft)
    return state
  })

  if (response) {
    return response
  }

  if (!event) {
    return simulationError(500, 'unexpected', 'Não foi possível publicar a alteração.')
  }

  const published: NftUpdatedEvent = event
  emitNftUpdated(published)
  if (duplicate) {
    emitNftUpdated(published)
  }
  if (stalePriceEth) {
    emitNftUpdated({
      ...published,
      eventId: `evt_${crypto.randomUUID()}`,
      version: Math.max(1, published.version - 1),
      nft: {
        ...published.nft,
        editions: published.nft.editions.map((edition) =>
          edition.id === value.editionId ? { ...edition, priceEth: stalePriceEth } : edition,
        ),
      },
    })
  }

  return new Response(null, { status: 204 })
}
