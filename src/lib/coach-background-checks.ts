export type CoachBackgroundCheck = { conductedOn?: string; verifiedAt: string; verifiedBy: string }

/** A fall season and the following spring share one annual club check. */
export function backgroundCheckCycle(season: string) {
  const match = /^(fall|spring)-(\d{4})$/.exec(season)
  if (!match) throw new Error('Expected a fall or spring season and year')
  const year = Number(match[2]) - (match[1] === 'spring' ? 1 : 0)
  return { key: `fall-${year}`, label: `Fall ${year} / Spring ${year + 1}` }
}
/** Annual boundary follows the configured fall season's start month/day. */
export function backgroundCheckCycleForDate(date: string, renewalDay = '08-01') {
  const boundary = /^\d{2}-\d{2}$/.test(renewalDay) ? renewalDay : '08-01'
  const year = Number(date.slice(0, 4)) - (date.slice(5) < boundary ? 1 : 0)
  return { ...backgroundCheckCycle(`fall-${year}`), startDate: `${year}-${boundary}` }
}

export function backgroundCheckStatus(record: CoachBackgroundCheck | undefined, firstPractice: string, today: string) {
  if (!record?.conductedOn || !record.verifiedAt || record.conductedOn > today) return 'Awaiting club verification'
  if (firstPractice && record.conductedOn > firstPractice) return 'Completed after first practice — club review required'
  return 'Verified complete'
}
