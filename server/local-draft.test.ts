import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, it } from 'vitest'
import { createLocalDraftStore, localDraftMiddleware } from './local-draft'

it('streams administrator assignments over HTTP to a separate coach connection', async () => {
  const store = createLocalDraftStore()
  const middleware = localDraftMiddleware(store)
  const server = createServer((request, response) => { void middleware(request, response, () => { response.statusCode = 404; response.end() }) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const controller = new AbortController()
  try {
    const denied = await fetch(origin + '/__local-draft/state', { headers: { origin: 'https://example.com' } })
    expect(denied.status).toBe(403)
    const coach = await fetch(origin + '/__local-draft/events', { signal: controller.signal })
    const reader = coach.body!.getReader()
    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toContain('"revision":0')
    const admin = await fetch(origin + '/__local-draft/state', {
      method: 'POST', headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ values: { scheduleBreaks: [{ id: 'spring', name: 'Spring break', startDate: '2030-03-11', endDate: '2030-03-15', includeFollowingWeekend: true, divisions: [] }], tournamentSetups: { U10: { lossLimit: 2, byeSeeds: '1', startDate: '2030-07-01', endDate: '2030-07-31', extraMatchMinutes: 20 } }, tournaments: { U10: { id: 't1', seeds: ['John Test', 'Coach B'], lossLimit: 2, rounds: [] } }, backgroundCheckRenewalDay: '08-01', fieldAvailability: [{ id: '8', active: false, divisions: ['U12', 'U14', 'U18'] }], picked: ['p1'], draftTeamAssignments: { p1: 'John Test' }, scheduleSettings: { U10: { startDate: '2030-06-01', blockedDates: ['2030-06-08'] } }, referees: [{ id: 'chris', name: 'Chris James', preferredContact: 'text', phone: '555-010-1234' }], games: [{ id: 'scheduled-1', division: 'U10', date: '2030-06-15', kickoff: '09:00', field: '1', durationMinutes: 55, scheduleStatus: 'scheduled' }] } }),
    })
    expect(admin.status).toBe(200)
    const update = await reader.read()
    const streamed = new TextDecoder().decode(update.value)
    expect(streamed).toContain('"picked":["p1"]')
    expect(streamed).toContain('"p1":"John Test"')
    const reconnected = await fetch(origin + '/__local-draft/state').then((response) => response.json())
    expect(reconnected.values.draftTeamAssignments).toEqual({ p1: 'John Test' })
    expect(reconnected.values.scheduleSettings.U10.blockedDates).toEqual(['2030-06-08'])
    expect(reconnected.values.games[0]).toMatchObject({ division: 'U10', kickoff: '09:00', durationMinutes: 55 })
    expect(reconnected.values.fieldAvailability[0]).toMatchObject({ id: '8', active: false })
    expect(reconnected.values.backgroundCheckRenewalDay).toBe('08-01')
    expect(reconnected.values.scheduleBreaks[0]).toMatchObject({ name: 'Spring break', includeFollowingWeekend: true })
    expect(reconnected.values.tournamentSetups.U10).toMatchObject({ lossLimit: 2, byeSeeds: '1', endDate: '2030-07-31' })
    expect(reconnected.values.tournaments.U10.seeds).toEqual(['John Test', 'Coach B'])
    expect(reconnected.values.referees[0]).toMatchObject({ id: 'chris', preferredContact: 'text' })
    await reader.cancel()
  } finally {
    controller.abort()
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
