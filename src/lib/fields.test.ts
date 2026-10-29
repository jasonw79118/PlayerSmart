import { describe, expect, it } from 'vitest'
import { defaultClubFields, PDSA_FIELD_GROUPS, validateField } from './fields'
import { availableSlots, defaultScheduleSettings, fieldAvailable, planMatches, roundRobin, slotFits, validateSettings } from './match-scheduler'

describe('club field map and scheduling availability', () => {
  it('uses the supplied field assignments without treating A fields as the main field', () => {
    expect(PDSA_FIELD_GROUPS.U6).toEqual(['3', '4', '5'])
    expect(PDSA_FIELD_GROUPS['U8 Boys']).toEqual(['7A', '6', '7'])
    expect(PDSA_FIELD_GROUPS['U8 Girls']).toEqual(['7A', '6', '7'])
    expect(PDSA_FIELD_GROUPS.U10).toEqual(['1A', '1', '2'])
    for (const division of ['U12', 'U14', 'U18']) expect(PDSA_FIELD_GROUPS[division]).toEqual(['8'])
    const fields = defaultClubFields()
    expect(fields).toHaveLength(10)
    const slot = { date: '2030-06-01', kickoff: '09:00', field: '1A', durationMinutes: 55, turnaroundMinutes: 10 }
    expect(fieldAvailable(slot, 'U10', fields)).toBe(true)
    expect(fieldAvailable(slot, 'U8 Boys', fields)).toBe(false)
    expect(validateSettings({ ...defaultScheduleSettings('U10', slot.date, '2030-08-31'), fields: ['8'], fieldAvailability: fields }, 'U10')).not.toHaveLength(0)
  })
  it('honors open hours, full-day exclusions and partial-day closures across divisions', () => {
    const fields = defaultClubFields().map((field) => field.id === '8' ? { ...field, availability: [{ id: 'sat', weekdays: [6], startTime: '10:00', endTime: '14:00', startDate: '', endDate: '' }], unavailableDates: ['2030-06-08'], closures: [{ id: 'maintenance', date: '2030-06-01', startTime: '10:00', endTime: '11:30', reason: 'Maintenance' }] } : field)
    expect(validateField(fields.find((field) => field.id === '8')!)).toEqual([])
    for (const division of ['U12', 'U14', 'U18']) {
      const slots = availableSlots({ ...defaultScheduleSettings(division, '2030-06-01', '2030-06-08'), fieldAvailability: fields }, division, '2030-06-01')
      expect(slots).toHaveLength(2)
      expect(slots.map((slot) => slot.kickoff)).toEqual(['11:30', '12:45'])
      expect(slots[0]).toMatchObject({ date: '2030-06-01', field: '8' })
    }
    const closed = fields.map((field) => field.id === '8' ? { ...field, active: false } : field)
    expect(availableSlots({ ...defaultScheduleSettings('U12', '2030-06-01', '2030-06-08'), fieldAvailability: closed }, 'U12', '2030-06-01')).toHaveLength(0)
  })
  it('prevents simultaneous U12/U14/U18 bookings on their shared field 8', () => {
    const settings = { ...defaultScheduleSettings('U14', '2030-06-01', '2030-08-31'), fieldAvailability: defaultClubFields() }
    const existing = { id: 'u12', division: 'U12', date: '2030-06-01', time: '9:00 AM', field: '8', durationMinutes: 65, turnaroundMinutes: 10, homeCoach: 'Older A', awayCoach: 'Older B' }
    const pair = { id: 'u14', division: 'U14', homeCoach: 'Coach A', awayCoach: 'Coach B' }
    const slot = { date: '2030-06-01', kickoff: '09:00', field: '8', durationMinutes: 65, turnaroundMinutes: 10 }
    expect(slotFits(pair, slot, [existing], settings)).toBe(false)
    expect(slotFits(pair, { ...slot, kickoff: '10:15' }, [existing], settings)).toBe(true)
  })
})

describe('primary, alternative and avoided match days', () => {
  const settings = { ...defaultScheduleSettings('U10', '2026-10-29', '2026-11-21'), fields: ['1'], dayStart: '09:00', dayEnd: '10:00', weekdays: [6, 2, 5], dayPriority: [6, 2, 5], avoidedWeekdays: [0, 3] }
  it('tries primary days before ordered alternatives, never silently adding another weekday', () => {
    const slots = availableSlots(settings, 'U10', '2026-10-29')
    const days = slots.map((slot) => new Date(slot.date + 'T12:00:00Z').getUTCDay())
    expect(days).toEqual([6, 6, 6, 6, 2, 2, 2, 5, 5, 5, 5])
    const plan = planMatches(roundRobin('U10', ['A', 'B', 'C', 'D', 'E'], 1), [], settings, '2026-10-29')
    expect(plan.unplaced).toHaveLength(0)
    expect(plan.placed.slice(0, 4).every(({ slot }) => new Date(slot.date + 'T12:00:00Z').getUTCDay() === 6)).toBe(true)
    expect(plan.placed.every(({ slot }) => ![0, 3].includes(new Date(slot.date + 'T12:00:00Z').getUTCDay()))).toBe(true)
  })
  it('uses the first allowed backup when primary dates are closed and rejects contradictory avoided priorities', () => {
    const primaryDates = ['2026-10-31', '2026-11-07', '2026-11-14', '2026-11-21']
    const slots = availableSlots({ ...settings, blockedDates: primaryDates }, 'U10', '2026-10-29')
    expect(slots[0].date).toBe('2026-11-03')
    const bad = { ...settings, dayPriority: [6, 0] }
    expect(validateSettings(bad, 'U10')).toContain('A priority day is also marked Avoid. Remove it from one of the lists.')
    expect(availableSlots(bad, 'U10', '2026-10-29')).toHaveLength(0)
  })
})
