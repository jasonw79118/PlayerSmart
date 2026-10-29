import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2030-05-31T12:00:00Z')) })
afterEach(() => vi.useRealTimers())
import { defaultScheduleSettings } from './match-scheduler'
import { assignAvailableReferees, refereeAvailable, refereeBackgroundCleared, refereeCandidates, validateReferee, type RefereeProfile } from './referees'
import type { ScoreGame } from './score-game'

const settings = { ...defaultScheduleSettings('U10', '2030-06-01', '2030-08-31'), refereeRestMinutes: 10, coachRestMinutes: 60 }
const profile: RefereeProfile = { id: 'chris', name: 'Chris James', active: true, phone: '555-010-1234', email: 'chris@example.test', preferredContact: 'text', divisions: ['U10'], availability: [{ id: 'sat', weekdays: [6], startTime: '09:00', endTime: '12:00', startDate: '2030-06-01', endDate: '2030-08-31' }], unavailableDates: ['2030-06-08'], notes: '', backgroundChecks: { 'fall-2029': { conductedOn: '2029-08-01', verifiedAt: '2029-08-02T12:00:00Z', verifiedBy: 'Admin' } } }
const game: ScoreGame = { id: 'one', division: 'U10', date: '2030-06-01', time: '9:00 AM', kickoff: '09:00', field: '1', durationMinutes: 55, turnaroundMinutes: 0, scheduleStatus: 'scheduled', homeCoach: 'Coach A', awayCoach: 'Coach B', homeTeam: 'A', awayTeam: 'B', homeColor: '#fff', awayColor: '#fff', homeScore: 0, awayScore: 0, homePlayers: 0, awayPlayers: 0, referee: '', homeSigned: false, awaySigned: false, homeSignedAt: '', awaySignedAt: '', homeSignatureName: '', awaySignatureName: '', finalized: false }
const slot = { date: game.date, kickoff: '09:00', field: '1', durationMinutes: 55, turnaroundMinutes: 0 }

describe('referee availability and assignments', () => {
  it('requires a current annual check, carries fall into spring, and blocks late, revoked and prior-year checks', () => {
    expect(refereeBackgroundCleared(profile, '2029-10-06')).toBe(true)
    expect(refereeBackgroundCleared(profile, '2030-03-02')).toBe(true)
    expect(refereeBackgroundCleared(profile, '2030-08-10')).toBe(false)
    expect(refereeAvailable({ ...profile, backgroundChecks: {} }, 'U10', slot)).toBe(false)
    expect(refereeBackgroundCleared({ ...profile, firstDutyDates: { 'fall-2029': '2029-07-31' } }, slot.date)).toBe(false)
    vi.setSystemTime(new Date('2030-08-05T12:00:00Z'))
    const renewed = { ...profile, backgroundChecks: { ...profile.backgroundChecks, 'fall-2030': { conductedOn: '2030-08-01', verifiedAt: '2030-08-02T12:00:00Z', verifiedBy: 'Admin' } } }
    expect(refereeAvailable(renewed, 'U10', { ...slot, date: '2030-08-10' })).toBe(true)
    expect(refereeBackgroundCleared({ ...renewed, backgroundChecks: { 'fall-2030': profile.backgroundChecks!['fall-2029'] } }, '2030-08-10')).toBe(false)
  })
  it('requires active, recorded availability for the full match and correct division', () => {
    expect(refereeAvailable(profile, 'U10', slot)).toBe(true)
    expect(refereeAvailable(profile, 'U12', slot)).toBe(false)
    expect(refereeAvailable({ ...profile, active: false }, 'U10', slot)).toBe(false)
    expect(refereeAvailable({ ...profile, availability: [] }, 'U10', slot)).toBe(false)
    expect(refereeAvailable(profile, 'U10', { ...slot, date: '2030-06-08' })).toBe(false)
    expect(refereeAvailable(profile, 'U10', { ...slot, date: '2030-06-02' })).toBe(false)
    expect(refereeAvailable(profile, 'U10', { ...slot, kickoff: '11:30' })).toBe(false)
    expect(refereeAvailable(profile, 'U10', { ...slot, date: '2030-05-25' })).toBe(false)
  })
  it('checks referee rest across divisions, rejects double bookings, and excludes a team’s own coach', () => {
    const existing = { ...game, id: 'other', division: 'U12', field: '8', referee: profile.name, refereeId: profile.id, refereeRestMinutes: 10, homeCoach: 'Other A', awayCoach: 'Other B' }
    expect(refereeCandidates(game, [existing], [profile], settings)).toHaveLength(0)
    expect(refereeCandidates({ ...game, kickoff: '10:00' }, [existing], [profile], settings)).toHaveLength(0)
    expect(refereeCandidates({ ...game, kickoff: '10:05' }, [existing], [profile], settings)).toHaveLength(1)
    expect(refereeCandidates({ ...game, homeCoach: profile.name }, [], [profile], settings)).toHaveLength(0)
  })
  it('assigns only eligible referees, spreads same-time fixtures, and reports uncovered matches', () => {
    const second = { ...profile, id: 'pat', name: 'Pat Example' }
    const matches = [game, { ...game, id: 'two', field: '2', homeCoach: 'Coach C', awayCoach: 'Coach D' }, { ...game, id: 'three', field: '3', homeCoach: 'Coach E', awayCoach: 'Coach F' }]
    const result = assignAvailableReferees(matches, [], [profile, second], settings)
    expect(result.games.map((match) => match.referee)).toEqual(['Chris James', 'Pat Example', ''])
    expect(result.unassigned).toHaveLength(1)
    expect(matches[0].referee).toBe('')
    const final = { ...game, referee: 'Original Official', finalized: true, homeScore: 1 }
    expect(assignAvailableReferees([final], [], [], settings).games[0]).toEqual(final)
  })
  it('validates preferred contact details, dates and availability windows', () => {
    expect(validateReferee(profile)).toEqual([])
    expect(validateReferee({ ...profile, phone: '' })).toContain('Enter a phone number for the preferred contact method.')
    expect(validateReferee({ ...profile, preferredContact: 'email', email: '' })).not.toHaveLength(0)
    expect(validateReferee({ ...profile, unavailableDates: ['2030-02-31'] })).not.toHaveLength(0)
    expect(validateReferee({ ...profile, availability: [{ ...profile.availability[0], endTime: '08:00' }] })).not.toHaveLength(0)
  })
})
