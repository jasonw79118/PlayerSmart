import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

const keys = new Set(['players', 'coachNames', 'divisionTeamCounts', 'assistantBackgroundChecks', 'headCoachDirectory', 'coachDirectory', 'teamStaff', 'draftOrder', 'completedEvaluators', 'consolidatedDivisions', 'demoUserAccess', 'draftPreferences', 'draftCoachChoices', 'draftTeamAssignments', 'draftCompleted', 'draftStartedAt', 'draftEndedAt', 'picked', 'draftJerseysBySeason', 'games', 'scheduleSettings', 'referees', 'fieldAvailability', 'backgroundCheckRenewalDay', 'tournaments', 'tournamentSetups', 'scheduleBreaks'])
export type DraftSnapshot = { revision: number; values: Record<string, unknown> }

export function createLocalDraftStore(file?: string) {
  let snapshot: DraftSnapshot = { revision: 0, values: {} }
  if (file && existsSync(file)) {
    try {
      const saved = JSON.parse(readFileSync(file, 'utf8')) as DraftSnapshot
      if (Number.isInteger(saved.revision) && saved.values && typeof saved.values === 'object') snapshot = saved
    } catch { /* A missing or invalid fixture file starts an empty workspace. */ }
  }
  const listeners = new Set<(snapshot: DraftSnapshot) => void>()
  return {
    read: () => snapshot,
    update(values: Record<string, unknown>, initialize = false) {
      const changes = Object.fromEntries(Object.entries(values).filter(([key]) => keys.has(key) && (!initialize || !Object.hasOwn(snapshot.values, key))))
      if (!Object.keys(changes).length) return snapshot
      snapshot = { revision: snapshot.revision + 1, values: { ...snapshot.values, ...changes } }
      if (file) writeFileSync(file, JSON.stringify(snapshot), 'utf8')
      listeners.forEach((listener) => listener(snapshot))
      return snapshot
    },
    subscribe(listener: (snapshot: DraftSnapshot) => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}

/** Vite development middleware only. Stores fabricated local test data, never Auth sessions. */
export function localDraftMiddleware(store: ReturnType<typeof createLocalDraftStore>) {
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0]
    if (path !== '/__local-draft/state' && path !== '/__local-draft/events') { next(); return }
    const host = request.headers.host ?? ''
    const loopback = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/
    let allowed = loopback.test(host)
    if (request.headers.origin) {
      try { allowed = allowed && new URL(request.headers.origin).host === host } catch { allowed = false }
    }
    if (!allowed) { response.writeHead(403); response.end(); return }
    if (path === '/__local-draft/events' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' })
      const send = (snapshot: DraftSnapshot) => response.write(`data: ${JSON.stringify(snapshot)}\n\n`)
      send(store.read())
      const unsubscribe = store.subscribe(send)
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15_000)
      response.on('close', () => { unsubscribe(); clearInterval(heartbeat) })
      return
    }
    response.setHeader('content-type', 'application/json')
    response.setHeader('cache-control', 'no-store')
    if (path === '/__local-draft/state' && request.method === 'GET') { response.end(JSON.stringify(store.read())); return }
    if (path === '/__local-draft/state' && request.method === 'POST') {
      try {
        let body = ''
        for await (const chunk of request) { body += chunk; if (body.length > 2_000_000) throw new Error('Too large') }
        const payload = JSON.parse(body) as { values?: Record<string, unknown>; initialize?: boolean }
        if (!payload.values || typeof payload.values !== 'object' || Array.isArray(payload.values)) throw new Error('Invalid values')
        response.end(JSON.stringify(store.update(payload.values, payload.initialize === true)))
      } catch { response.statusCode = 400; response.end(JSON.stringify({ error: 'Invalid local draft update' })) }
      return
    }
    response.statusCode = 405; response.end(JSON.stringify({ error: 'Method not allowed' }))
  }
}
