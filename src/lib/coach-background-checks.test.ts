import { describe, expect, it } from 'vitest'
import { backgroundCheckCycle, backgroundCheckCycleForDate, backgroundCheckStatus } from './coach-background-checks'

describe('annual club coach background checks', () => {
  it('uses the configured fall renewal boundary for both spring carryover and the next annual check', () => {
    expect(backgroundCheckCycleForDate('2027-03-01').key).toBe('fall-2026')
    expect(backgroundCheckCycleForDate('2027-07-31').key).toBe('fall-2026')
    expect(backgroundCheckCycleForDate('2027-08-01').key).toBe('fall-2027')
    expect(backgroundCheckCycleForDate('2027-07-01', '07-01')).toMatchObject({ key: 'fall-2027', startDate: '2027-07-01' })
  })
  it('carries a fall check into the following spring but requires a new check next fall', () => {
    const record = { conductedOn: '2026-08-01', verifiedAt: '2026-08-02T12:00:00Z', verifiedBy: 'Admin' }
    const checks = { 'fall-2026:frankie adams': record }
    const lookup = (season: string) => checks[`${backgroundCheckCycle(season).key}:frankie adams` as keyof typeof checks]
    expect(backgroundCheckCycle('spring-2027').label).toBe('Fall 2026 / Spring 2027')
    expect(backgroundCheckStatus(lookup('fall-2026'), '2026-08-10', '2026-10-29')).toBe('Verified complete')
    expect(backgroundCheckStatus(lookup('spring-2027'), '2027-03-01', '2027-03-01')).toBe('Verified complete')
    expect(backgroundCheckStatus(lookup('fall-2027'), '2027-08-10', '2027-08-01')).toBe('Awaiting club verification')
    expect(backgroundCheckCycle('spring-2026').key).toBe('fall-2025')
  })
  it('flags checks completed after first practice and requires dates on old records', () => {
    const record = { conductedOn: '2026-08-11', verifiedAt: '2026-08-12T12:00:00Z', verifiedBy: 'Admin' }
    expect(backgroundCheckStatus(record, '2026-08-10', '2026-10-29')).toContain('Completed after first practice')
    expect(backgroundCheckStatus(record, '', '2026-08-01')).toBe('Awaiting club verification')
    expect(backgroundCheckStatus({ ...record, conductedOn: undefined }, '', '2026-10-29')).toBe('Awaiting club verification')
  })
})
