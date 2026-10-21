import { useSyncExternalStore } from 'react'

let current: string | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function publishRealtimeNotice(message: string) {
  current = message
  emit()
}

export function clearRealtimeNotice() {
  current = null
  emit()
}

export function useRealtimeNotice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => current,
    () => null,
  )
}
