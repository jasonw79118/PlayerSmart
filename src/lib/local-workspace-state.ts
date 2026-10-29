import { useCallback, useState, useSyncExternalStore, type SetStateAction } from 'react'
import { LocalDraftClient } from './local-draft-client'

const prefix = 'playersmart-local-draft-v1:'
const stores = new Map<string, { value: unknown; listeners: Set<() => void> }>()
let serverClient: LocalDraftClient | null = null
let seedRequested = false
let seeded = false
let syncServer: (() => Promise<void>) | null = null

export function startLocalDraftSync(administrator: boolean) {
  // jsdom and non-browser tests retain the existing in-memory fixture behavior.
  if (typeof window.EventSource === 'undefined') return
  seedRequested ||= administrator
  if (serverClient) { void syncServer?.().catch(() => {}); return }
  serverClient = new LocalDraftClient(async (values, initialize) => {
    const response = await fetch('/__local-draft/state', values ? {
      method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit', cache: 'no-store',
      body: JSON.stringify({ values, initialize }),
    } : { credentials: 'omit', cache: 'no-store' })
    if (!response.ok) throw new Error('Local draft sync unavailable')
    return response.json()
  }, (values) => {
    const changed: { listeners: Set<() => void> }[] = []
    Object.entries(values).forEach(([key, value]) => {
      const storageKey = prefix + key
      const store = stores.get(storageKey)
      if (store && JSON.stringify(store.value) === JSON.stringify(value)) return
      if (store) { store.value = value; changed.push(store) }
      else stores.set(storageKey, { value, listeners: new Set() })
      try { window.localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* The server still shares updates if local storage is unavailable. */ }
    })
    changed.forEach((store) => store.listeners.forEach((notify) => notify()))
  })
  syncServer = async () => {
    if (seedRequested && !seeded) {
      await serverClient!.initialize(Object.fromEntries([...stores].map(([key, store]) => [key.slice(prefix.length), store.value])))
      seeded = true
    }
    await serverClient!.refresh()
  }
  const events = new window.EventSource('/__local-draft/events')
  events.onmessage = (event) => { try { serverClient!.accept(JSON.parse(event.data)) } catch { /* A later snapshot repairs a malformed message. */ } }
  events.onopen = () => { void syncServer!().catch(() => {}) }
  window.addEventListener('focus', () => { void syncServer!().catch(() => {}) })
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void syncServer!().catch(() => {}) })
  window.setInterval(() => { void syncServer!().catch(() => {}) }, 2000)
  void syncServer().catch(() => {})
}

/** Development fixtures only: share the local draft across tabs without sharing account identity. */
export function useLocalWorkspaceState<T>(key: string, initial: T | (() => T), shared: boolean) {
  const storageKey = prefix + key
  const [store] = useWorkspaceStore(storageKey, initial, shared)
  const subscribe = useCallback((listener: () => void) => {
    store.listeners.add(listener)
    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) return
      if (serverClient) return // Server events avoid cross-browser cache divergence.
      try { store.value = JSON.parse(event.newValue); store.listeners.forEach((notify) => notify()) } catch { /* Ignore invalid local fixture data. */ }
    }
    if (shared) window.addEventListener('storage', onStorage)
    return () => { store.listeners.delete(listener); if (shared) window.removeEventListener('storage', onStorage) }
  }, [store, shared, storageKey])
  const value = useSyncExternalStore(subscribe, () => store.value as T)
  const setValue = useCallback((action: SetStateAction<T>) => {
    let current = store.value as T
    if (shared) {
      try { const saved = !serverClient && window.localStorage.getItem(storageKey); if (saved) current = JSON.parse(saved) } catch { /* Use in-memory fixtures if storage is unavailable. */ }
    }
    const next = typeof action === 'function' ? (action as (value: T) => T)(current) : action
    store.value = next
    if (shared) { try { window.localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Continue in memory. */ } }
    if (shared && serverClient) serverClient.write(key, next)
    store.listeners.forEach((notify) => notify())
  }, [store, shared, storageKey])
  return [value, setValue] as const
}

function useWorkspaceStore<T>(key: string, initial: T | (() => T), shared: boolean) {
  return useState(() => {
    if (shared && stores.has(key)) return stores.get(key)!
    let value = typeof initial === 'function' ? (initial as () => T)() : initial
    if (shared) {
      try { const saved = window.localStorage.getItem(key); if (saved) value = JSON.parse(saved) } catch { /* Use fresh fixtures. */ }
    }
    const store = { value: value as unknown, listeners: new Set<() => void>() }
    if (shared) stores.set(key, store)
    return store
  })
}
