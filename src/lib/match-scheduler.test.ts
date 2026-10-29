import { describe, expect, it } from 'vitest'
import { pdsaRulesKnowledge } from './pdsa-rules'
import { availableSlots, coachRest, refereeRest, defaultScheduleSettings, hasRecordedPlay, matchTiming, planMatches, roundRobin, slotFits, timeMinutes, validateSettings, type MatchPair, type MatchResource } from './match-scheduler'

const settings = { ...defaultScheduleSettings('U10', '2026-10-31', '2026-12-19'), dayEnd: '13:00' }
const coaches = ['Coach A', 'Coach B', 'Coach C', 'Coach D', 'Coach E']
const pair: MatchPair = { id: 'new', division: 'U10', homeCoach: 'Coach A', awayCoach: 'Coach B' }
const slot = { date: '2026-10-31', kickoff: '09:00', field: '1', durationMinutes: 55, turnaroundMinutes: 10 }
const game: MatchResource = { id: 'booked', date: slot.date, time: '9:00 AM', kickoff: '09:00', field: '1', durationMinutes: 55, turnaroundMinutes: 10, homeCoach: 'Other A', awayCoach: 'Other B', division: 'U10', scheduleStatus: 'scheduled' }

describe('PDSA division scheduling', () => {
  it('reserves playing time plus the PDSA Law 7 quarter and halftime breaks', () => {
    const rule = pdsaRulesKnowledge.find((entry) => entry.id === 'pdsa-law-7-duration')!
    expect(rule.verified).toBe(true)
    expect(rule.text).toContain('U8 games have four 10-minute quarters')
    expect(rule.text).toContain('U10 games have two 25-minute halves')
    expect(matchTiming('U8 Boys')).toMatchObject({ playing: 40, breaks: 9, total: 49 })
    expect(matchTiming('U8 Girls').total).toBe(49)
    expect(matchTiming('U10').total).toBe(55)
    for (const division of ['U12', 'U14', 'U18']) expect(matchTiming(division).total).toBe(65)
    expect(() => matchTiming('U16')).toThrow()
  })
  it('creates ten unique matches for five teams with byes and opposite venues in a repeat cycle', () => {
    const pairs = roundRobin('U10', coaches, 1)
    expect(pairs).toHaveLength(10)
    expect(new Set(pairs.map((match) => [match.homeCoach, match.awayCoach].sort().join('|'))).size).toBe(10)
    for (const coach of coaches) expect(pairs.filter((match) => [match.homeCoach, match.awayCoach].includes(coach))).toHaveLength(4)
    for (const round of [1, 2, 3, 4, 5]) {
      const matches = pairs.filter((match) => match.round === round)
      expect(new Set(matches.flatMap((match) => [match.homeCoach, match.awayCoach])).size).toBe(4)
    }
    const repeated = roundRobin('U10', coaches, 2)
    expect(repeated).toHaveLength(20)
    for (const match of pairs) expect(repeated.filter((other) => other.homeCoach === match.awayCoach && other.awayCoach === match.homeCoach)).toHaveLength(1)
  })
  it('fits a full season without field overlaps or more than one daily game per team', () => {
    const existing = [{ ...game, date: '2026-11-07', division: 'U14', field: '1' }]
    const config = { ...settings, blockedDates: ['2026-10-31'] }
    const result = planMatches(roundRobin('U10', coaches, 1), existing, config, '2026-10-29')
    expect(result.unplaced).toHaveLength(0)
    expect(result.placed).toHaveLength(10)
    const booked = [...existing]
    for (const { pair: planned, slot: reserved } of result.placed) {
      expect(reserved.date).not.toBe('2026-10-31')
      expect(new Date(reserved.date + 'T12:00:00Z').getUTCDay()).toBe(6)
      expect(slotFits(planned, reserved, booked, config)).toBe(true)
      expect(timeMinutes(reserved.kickoff) + reserved.durationMinutes).toBeLessThanOrEqual(timeMinutes(config.dayEnd))
      booked.push({ ...planned, ...reserved, time: reserved.kickoff, scheduleStatus: 'scheduled' })
    }
    expect(existing[0].date).toBe('2026-11-07')
  })
  it('checks shared fields, head/assistant coaches and assigned referees across divisions', () => {
    expect(slotFits(pair, slot, [game], settings)).toBe(false)
    expect(slotFits(pair, slot, [{ ...game, field: 'Field 1' }], settings)).toBe(false)
    expect(slotFits(pair, slot, [{ ...game, field: '2', homeCoach: 'Coach A', division: 'U12' }], settings)).toBe(false)
    expect(slotFits({ ...pair, homeAssistantCoach: 'Other A' }, { ...slot, field: '2' }, [game], settings)).toBe(false)
    expect(slotFits({ ...pair, referee: 'Chris' }, { ...slot, field: '2' }, [{ ...game, referee: 'Chris' }], settings)).toBe(false)
    expect(slotFits(pair, { ...slot, field: '2' }, [game], settings)).toBe(true)
    expect(slotFits(pair, { ...slot, kickoff: '09:55' }, [game], settings)).toBe(false)
    expect(slotFits(pair, { ...slot, kickoff: '10:05' }, [game], settings)).toBe(true)
  })
  it('counts each team separately and respects rest periods even with multiple games allowed', () => {
    const config = { ...settings, gamesPerTeamPerDay: 2 }
    const morning = [{ ...game, homeCoach: 'Coach A' }, { ...game, id: 'other', field: '2', homeCoach: 'Coach B' }]
    expect(slotFits(pair, { ...slot, kickoff: '10:00' }, morning, config)).toBe(false)
    expect(slotFits(pair, { ...slot, kickoff: '10:30' }, morning, config)).toBe(true)
    expect(slotFits(pair, { ...slot, kickoff: '10:30' }, morning, settings)).toBe(false)
  })
  it('uses independent coach/referee rests and honors saved rest limits from another division', () => {
    const config = { ...settings, coachRestMinutes: 60, refereeRestMinutes: 5, gamesPerTeamPerDay: 2 }
    const refereeGame = { ...game, division: 'U12', referee: 'Chris', refereeId: 'chris' }
    expect(slotFits({ ...pair, referee: 'Chris', refereeId: 'chris' }, { ...slot, field: '2', kickoff: '10:00' }, [refereeGame], config)).toBe(true)
    expect(slotFits(pair, { ...slot, field: '2', kickoff: '10:00' }, [{ ...game, homeCoach: 'Coach A' }], config)).toBe(false)
    expect(slotFits({ ...pair, referee: 'Chris', refereeId: 'chris' }, { ...slot, field: '2', kickoff: '10:00' }, [{ ...refereeGame, refereeRestMinutes: 30 }], config)).toBe(false)
    expect(slotFits({ ...pair, referee: 'Coach A' }, slot, [], config)).toBe(false)
    const legacy = { ...settings, coachRestMinutes: undefined, refereeRestMinutes: undefined, restMinutes: 45 }
    expect(coachRest(legacy)).toBe(45)
    expect(refereeRest(legacy)).toBe(45)
    expect(coachRest({ ...legacy, coachRestMinutes: 90 })).toBe(90)
    expect(refereeRest({ ...legacy, coachRestMinutes: 90 })).toBe(45)
  })
  it('enforces division-specific calendar spacing for generation and replacement slots', () => {
    const config = { ...settings, minimumDaysBetweenGames: 3, weekdays: [0, 1, 2, 3, 4, 5, 6] }
    const existing = { ...game, homeCoach: 'Coach A' }
    expect(slotFits(pair, { ...slot, date: '2026-11-01' }, [existing], config)).toBe(false)
    expect(slotFits(pair, { ...slot, date: '2026-11-03' }, [existing], config)).toBe(true)
    expect(slotFits(pair, { ...slot, date: '2026-11-01' }, [existing], settings)).toBe(true)
    expect(slotFits(pair, { ...slot, date: '2026-11-01' }, [{ ...existing, division: 'U12' }], config)).toBe(true)
    const plan = planMatches(roundRobin('U10', coaches, 1), [], config, '2026-10-29')
    expect(plan.unplaced).toHaveLength(0)
    for (const coach of coaches) {
      const dates = plan.placed.filter(({ pair }) => [pair.homeCoach, pair.awayCoach].includes(coach)).map(({ slot }) => Date.parse(slot.date)).sort((a, b) => a - b)
      for (let index = 1; index < dates.length; index++) expect((dates[index] - dates[index - 1]) / 86_400_000).toBeGreaterThanOrEqual(3)
    }
  })
  it('releases postponed slots, respects exact kickoff parameters and avoids elapsed times', () => {
    expect(slotFits(pair, slot, [{ ...game, scheduleStatus: 'postponed' }], settings)).toBe(true)
    expect(slotFits(pair, slot, [{ ...game, scheduleStatus: 'cancelled' }], settings)).toBe(true)
    const slots = availableSlots({ ...settings, kickoffTimes: '09:00,10:30' }, 'U10', '2026-10-31T10:00')
    expect(slots[0]).toMatchObject({ date: '2026-10-31', kickoff: '10:30' })
    expect(new Set(slots.map((value) => value.kickoff))).toEqual(new Set(['09:00', '10:30']))
  })
  it('reports insufficient capacity and rejects invalid windows without changing fixtures', () => {
    const result = planMatches(roundRobin('U10', coaches, 1), [], { ...settings, endDate: settings.startDate, fields: ['1'], dayEnd: '10:00' }, '2026-10-29')
    expect(result.placed).toHaveLength(1)
    expect(result.unplaced).toHaveLength(9)
    expect(validateSettings({ ...settings, startDate: '2026-02-31' }, 'U10')).not.toHaveLength(0)
    expect(validateSettings({ ...settings, dayEnd: '09:30' }, 'U10')).not.toHaveLength(0)
    expect(validateSettings({ ...settings, fields: ['1', '1'] }, 'U10')).not.toHaveLength(0)
    expect(validateSettings({ ...settings, kickoffTimes: '9:99' }, 'U10')).not.toHaveLength(0)
    expect(hasRecordedPlay({ ...game, homeScore: 1 })).toBe(true)
    expect(hasRecordedPlay({ ...game, homeSigned: true })).toBe(true)
    expect(hasRecordedPlay({ ...game, finalized: true })).toBe(true)
    expect(hasRecordedPlay(game)).toBe(false)
  })
})
