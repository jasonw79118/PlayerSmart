import { coachRest, clubToday, displayTime, hasRecordedPlay, matchTiming, refereeRest, slotFits, timeMinutes, type MatchPair, type MatchSlot, type ScheduleSettings } from './match-scheduler'
import { backgroundCheckCycleForDate, backgroundCheckStatus, type CoachBackgroundCheck } from './coach-background-checks'
import type { ScoreGame } from './score-game'

export type RefereeAvailability = { id: string; weekdays: number[]; startTime: string; endTime: string; startDate: string; endDate: string }
export type RefereeProfile = {
  id: string; name: string; active: boolean; phone: string; email: string; preferredContact: '' | 'text' | 'call' | 'email'
  divisions: string[]; availability: RefereeAvailability[]; unavailableDates: string[]; notes: string
  backgroundChecks?: Record<string, CoachBackgroundCheck>; firstDutyDates?: Record<string, string>
}
export const emptyReferee = (): RefereeProfile => ({ id: crypto.randomUUID(), name: '', active: true, phone: '', email: '', preferredContact: '', divisions: [], availability: [], unavailableDates: [], notes: '' })
const normalize = (value: string) => value.trim().toLowerCase()
export function validDate(date: string) {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date + 'T12:00:00Z') : NaN
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date
}
export function validateReferee(profile: RefereeProfile): string[] {
  const errors: string[] = []
  if (!profile.name.trim()) errors.push('Enter the referee’s full name.')
  if (profile.preferredContact === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) errors.push('Enter an email address for the preferred contact method.')
  if (['text', 'call'].includes(profile.preferredContact) && profile.phone.replace(/\D/g, '').length < 7) errors.push('Enter a phone number for the preferred contact method.')
  if (profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) errors.push('Enter a valid email address.')
  if (profile.unavailableDates.some((date) => !validDate(date))) errors.push('Unavailable dates must be valid YYYY-MM-DD dates.')
  for (const window of profile.availability) {
    if (!window.weekdays.length || window.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) errors.push('Select match days for each availability window.')
    if (!Number.isFinite(timeMinutes(window.startTime)) || !Number.isFinite(timeMinutes(window.endTime)) || timeMinutes(window.startTime) >= timeMinutes(window.endTime)) errors.push('Each availability window needs a start time before its end time.')
    if (window.startDate && !validDate(window.startDate) || window.endDate && !validDate(window.endDate) || window.startDate && window.endDate && window.startDate > window.endDate) errors.push('Check the dates on each availability window.')
  }
  return [...new Set(errors)]
}
export function refereeBackgroundCleared(profile: RefereeProfile, date: string, renewalDay = '08-01') {
  const cycle = backgroundCheckCycleForDate(date, renewalDay)
  const record = profile.backgroundChecks?.[cycle.key]
  return !!record?.conductedOn && record.conductedOn >= cycle.startDate && Number.isFinite(Date.parse(record.verifiedAt)) && record.verifiedAt.slice(0, 10) <= clubToday() && backgroundCheckStatus(record, profile.firstDutyDates?.[cycle.key] || date, clubToday()) === 'Verified complete'
}
export function refereeAvailable(profile: RefereeProfile, division: string, slot: MatchSlot, renewalDay = '08-01') {
  if (!profile.active || !profile.divisions.includes(division) || profile.unavailableDates.includes(slot.date) || validateReferee(profile).length || !validDate(slot.date)) return false
  if (!refereeBackgroundCleared(profile, slot.date, renewalDay)) return false
  const day = new Date(slot.date + 'T12:00:00Z').getUTCDay()
  const start = timeMinutes(slot.kickoff); const end = start + slot.durationMinutes
  return profile.availability.some((window) => window.weekdays.includes(day) && (!window.startDate || slot.date >= window.startDate) && (!window.endDate || slot.date <= window.endDate) && start >= timeMinutes(window.startTime) && end <= timeMinutes(window.endTime))
}
export function matchSlot(game: ScoreGame): MatchSlot {
  return { date: game.date, kickoff: game.kickoff ?? game.time, field: game.field ?? '', durationMinutes: game.durationMinutes ?? (game.division ? matchTiming(game.division).total : 90), turnaroundMinutes: game.turnaroundMinutes ?? 0 }
}
export function refereeCandidates(game: ScoreGame, games: ScoreGame[], profiles: RefereeProfile[], settings: ScheduleSettings) {
  if (!game.division) return []
  const slot = matchSlot(game)
  return profiles.filter((profile) => {
    const pair: MatchPair = { id: game.id, division: game.division!, homeCoach: game.homeCoach, awayCoach: game.awayCoach, homeAssistantCoach: game.homeAssistantCoach, awayAssistantCoach: game.awayAssistantCoach, referee: profile.name, refereeId: profile.id }
    return refereeAvailable(profile, game.division!, slot, settings.fallRenewalDay) && slotFits(pair, slot, games, settings)
  }).sort((a, b) => {
    const load = (referee: RefereeProfile) => games.filter((other) => other.date === game.date && other.id !== game.id && other.scheduleStatus !== 'cancelled' && other.scheduleStatus !== 'postponed' && (other.refereeId === referee.id || !other.refereeId && normalize(other.referee) === normalize(referee.name))).length
    return load(a) - load(b) || a.name.localeCompare(b.name)
  })
}
/** Populate proposed fixtures only; callers review and apply the returned changes. */
export function assignAvailableReferees(proposed: ScoreGame[], existing: ScoreGame[], profiles: RefereeProfile[], settings: ScheduleSettings) {
  const ids = new Set(proposed.map((game) => game.id))
  const booked = existing.filter((game) => !ids.has(game.id))
  const changes: ScoreGame[] = []
  const unassigned: string[] = []
  for (const game of [...proposed].sort((a, b) => a.date.localeCompare(b.date) || timeMinutes(a.kickoff ?? a.time) - timeMinutes(b.kickoff ?? b.time))) {
    if (hasRecordedPlay(game)) { changes.push(game); booked.push(game); continue }
    const candidates = refereeCandidates(game, booked, profiles, settings)
    const keep = candidates.find((referee) => game.refereeId ? referee.id === game.refereeId : normalize(referee.name) === normalize(game.referee))
    const referee = keep ?? candidates[0]
    const assigned = { ...game, referee: referee?.name ?? '', refereeId: referee?.id, coachRestMinutes: coachRest(settings), refereeRestMinutes: refereeRest(settings) }
    if (!referee) unassigned.push(`${game.date} ${displayTime(game.kickoff ?? game.time)} — ${game.homeTeam} vs ${game.awayTeam}`)
    changes.push(assigned); booked.push(assigned)
  }
  return { games: changes, unassigned }
}
