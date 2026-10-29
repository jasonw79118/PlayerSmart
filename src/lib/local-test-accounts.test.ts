import { describe, expect, it } from 'vitest'
import { localTestAccountFor } from './local-test-accounts'
import { createDraftTestData } from './draft-test-data'

describe('local test profiles', () => {
  it('resolves the named coach and referee only on a local development site', () => {
    expect(localTestAccountFor(true, { hostname: 'localhost', search: '?testAccount=coach-john-test' })?.role).toBe('Coach')
    expect(localTestAccountFor(true, { hostname: 'localhost', search: '?testAccount=ref-chris-james' })?.name).toBe('Chris James')
    expect(localTestAccountFor(false, { hostname: 'localhost', search: '?testAccount=coach-john-test' })).toBeNull()
    expect(localTestAccountFor(true, { hostname: 'example.com', search: '?testAccount=coach-john-test' })).toBeNull()
    expect(localTestAccountFor(true, { hostname: 'localhost', search: '?testAccount=unknown' })).toBeNull()
  })
  it('places John on the U10 coach list while retaining five teams and thirty evaluated players', () => {
    const data = createDraftTestData(['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'], { primaryCoach: 'John Test' })
    expect(data.coachNames.U10).toHaveLength(5)
    expect(data.coachNames.U10[0]).toBe('John Test')
    expect(data.players.filter((player) => player.grade === 'U10')).toHaveLength(30)
    expect(data.teamStaff['U10:John Test'].headCoach).toBe('John Test')
  })
})
