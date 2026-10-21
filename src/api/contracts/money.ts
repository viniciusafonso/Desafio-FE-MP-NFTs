const scale = 8
const scaleFactor = 10n ** BigInt(scale)
const ethPattern = /^\d+(\.\d{1,8})?$/

export function parseEthMinor(value: string) {
  if (!ethPattern.test(value)) {
    throw new Error(`Preço ETH inválido: ${value}`)
  }

  const [whole, fraction = ''] = value.split('.')
  const padded = fraction.padEnd(scale, '0')
  return BigInt(whole) * scaleFactor + BigInt(padded)
}

export function formatEthMinor(minor: bigint) {
  const whole = minor / scaleFactor
  const fraction = (minor % scaleFactor).toString().padStart(scale, '0').replace(/0+$/, '')
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString()
}

export function multiplyEth(priceEth: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('A quantidade precisa ser um inteiro positivo.')
  }

  return formatEthMinor(parseEthMinor(priceEth) * BigInt(quantity))
}

export function addEth(left: string, right: string) {
  return formatEthMinor(parseEthMinor(left) + parseEthMinor(right))
}

export function subtractEth(left: string, right: string) {
  const difference = parseEthMinor(left) - parseEthMinor(right)
  return formatEthMinor(difference < 0n ? 0n : difference)
}

export function percentOfEth(value: string, percent: number) {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error('Percentual inválido.')
  }

  return formatEthMinor((parseEthMinor(value) * BigInt(percent)) / 100n)
}

export function compareEth(left: string, right: string) {
  const difference = parseEthMinor(left) - parseEthMinor(right)
  if (difference === 0n) {
    return 0
  }

  return difference < 0n ? -1 : 1
}

export function lowestAvailablePrice(editions: Array<{ priceEth: string; remaining: number }>) {
  const available = editions.filter((edition) => edition.remaining > 0)
  const pool = available.length > 0 ? available : editions
  return pool.reduce(
    (lowest, edition) => (compareEth(edition.priceEth, lowest) < 0 ? edition.priceEth : lowest),
    pool[0]?.priceEth ?? '0',
  )
}
