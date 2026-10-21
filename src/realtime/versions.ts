const versions = new Map<string, number>()
const seen = new Set<string>()

export function acceptEvent(kind: 'nft' | 'order', event: { eventId: string; resourceId: string; version: number }) {
  if (seen.has(event.eventId)) {
    return false
  }

  const key = `${kind}:${event.resourceId}`
  const current = versions.get(key) ?? 0
  if (event.version <= current) {
    seen.add(event.eventId)
    return false
  }

  seen.add(event.eventId)
  versions.set(key, event.version)
  return true
}

export function rememberVersion(kind: 'nft' | 'order', resourceId: string, version: number) {
  const key = `${kind}:${resourceId}`
  const current = versions.get(key) ?? 0
  if (version > current) {
    versions.set(key, version)
  }
}

export function forgetOrderVersions() {
  for (const key of versions.keys()) {
    if (key.startsWith('order:')) {
      versions.delete(key)
    }
  }
}
