import { describe, expect, it } from 'vitest'
import { createLocalDraftStore } from '../../server/local-draft'
import { LocalDraftClient } from './local-draft-client'

describe('draft sync between separate browser contexts', () => {
  it('sends assignments to an independent coach context and catches up after missed events', async () => {
    const server = createLocalDraftStore()
    const request = async (values?: Record<string, unknown>, initialize?: boolean) => structuredClone(values ? server.update(values, initialize) : server.read())
    let coachValues: Record<string, unknown> = {}
    const admin = new LocalDraftClient(request, () => {})
    const coach = new LocalDraftClient(request, (values) => { coachValues = { ...coachValues, ...values } })
    await admin.initialize({ picked: [], draftTeamAssignments: {}, players: [{ id: 'p1' }, { id: 'p2' }] })
    await coach.refresh()
    const unsubscribe = server.subscribe((snapshot) => coach.accept(structuredClone(snapshot)))
    admin.write('picked', ['p1'])
    admin.write('draftTeamAssignments', { p1: 'John Test' })
    await admin.flush()
    expect(coachValues.picked).toEqual(['p1'])
    expect(coachValues.draftTeamAssignments).toEqual({ p1: 'John Test' })
    unsubscribe()
    admin.write('picked', ['p1', 'p2'])
    admin.write('draftTeamAssignments', { p1: 'John Test', p2: 'John Test' })
    await admin.flush()
    expect(coachValues.picked).toEqual(['p1'])
    await coach.refresh()
    expect(coachValues.picked).toEqual(['p1', 'p2'])
    expect(coachValues.draftTeamAssignments).toEqual({ p1: 'John Test', p2: 'John Test' })
    // A stale browser's initialization must not erase existing picks.
    await admin.initialize({ picked: [], draftTeamAssignments: {} })
    expect(server.read().values.picked).toEqual(['p1', 'p2'])
  })
  it('ignores an older response and retries a write after a connection failure', async () => {
    const server = createLocalDraftStore()
    let unavailable = true
    let received: Record<string, unknown> = {}
    const client = new LocalDraftClient(async (values) => {
      if (values && unavailable) throw new Error('Disconnected')
      return structuredClone(values ? server.update(values) : server.read())
    }, (values) => { received = { ...received, ...values } })
    client.write('draftTeamAssignments', { p1: 'John Test' })
    await Promise.resolve()
    unavailable = false
    await client.refresh()
    expect(server.read().values.draftTeamAssignments).toEqual({ p1: 'John Test' })
    client.accept({ revision: 0, values: { draftTeamAssignments: {} } })
    expect(received.draftTeamAssignments).toEqual({ p1: 'John Test' })
  })
})
