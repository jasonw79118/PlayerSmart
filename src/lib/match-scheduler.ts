import { PDSA_RULEBOOK_VERSION } from './pdsa-rules'
import { PDSA_FIELD_GROUPS } from './field-layout'
import type { ClubField } from './fields'
import { breaksOnDate, validateScheduleBreak, type ScheduleBreak } from './schedule-breaks'

export const matchTiming = (division: string) => {
  const age = division.match(/^U(\d+)/)?.[1]
  if (age === '6') return { playing: 32, breaks: 9, total: 41, description: '4 × 8 minutes; two 2-minute breaks and 5-minute halftime' }
  if (age === '8') return { playing: 40, breaks: 9, total: 49, description: '4 × 10 minutes; two 2-minute breaks and 5-minute halftime' }
  if (age === '10') return { playing: 50, breaks: 5, total: 55, description: '2 × 25 minutes and 5-minute halftime' }
  if (['12', '14', '18'].includes(age ?? '')) return { playing: 60, breaks: 5, total: 65, description: '2 × 30 minutes and 5-minute halftime' }
  throw new Error('No verified PDSA match timing for this division.')
}
export const timingSource = `PDSA ${PDSA_RULEBOOK_VERSION}, Law 7, page 10`
export type ScheduleStatus = 'scheduled' | 'postponed' | 'cancelled'
export type ScheduleHistory = { date: string; time: string; field?: string; status: ScheduleStatus; reason: string; changedAt: string }
export type ScheduleInfo = {
  division?: string; kickoff?: string; field?: string; durationMinutes?: number; turnaroundMinutes?: number
  scheduleStatus?: ScheduleStatus; scheduleRound?: number; scheduleReason?: string; scheduleHistory?: ScheduleHistory[]
  homeAssistantCoach?: string; awayAssistantCoach?: string
  refereeId?: string; coachRestMinutes?: number; refereeRestMinutes?: number
}
export type MatchResource = ScheduleInfo & {
  id: string; date: string; time: string; homeCoach: string; awayCoach: string; referee?: string
  finalized?: boolean; homeScore?: number; awayScore?: number; homeSigned?: boolean; awaySigned?: boolean
  homePlayers?: number; awayPlayers?: number; homeSignature?: unknown[]; awaySignature?: unknown[]
  actualStartedAt?: string; actualEndedAt?: string
}
export type MatchPair = { id: string; division: string; homeCoach: string; awayCoach: string; homeAssistantCoach?: string; awayAssistantCoach?: string; referee?: string; refereeId?: string; round?: number; durationMinutes?: number }
export type MatchSlot = { date: string; kickoff: string; field: string; durationMinutes: number; turnaroundMinutes: number; coachRestMinutes?: number; refereeRestMinutes?: number }
export type ScheduleSettings = {
  startDate: string; endDate: string; weekdays: number[]; dayStart: string; dayEnd: string
  kickoffTimes: string; fields: string[]; turnaroundMinutes: number; coachRestMinutes?: number; refereeRestMinutes?: number; restMinutes?: number
  gamesPerTeamPerDay: number; minimumDaysBetweenGames?: number; cycles: number; blockedDates: string[]
  dayPriority?: number[]; avoidedWeekdays?: number[]; fieldAvailability?: ClubField[]; fallRenewalDay?: string
  extraMatchMinutes?: number
  scheduleBreaks?: ScheduleBreak[]
}
export const scheduleDateBlocked = (settings: ScheduleSettings, date: string, division: string) => settings.blockedDates.includes(date) || breaksOnDate(settings.scheduleBreaks ?? [],date,division).length>0
// Retain the old shared setting when opening saved schedules, until Admin edits each value.
export const coachRest = (settings: ScheduleSettings) => settings.coachRestMinutes ?? settings.restMinutes ?? 30
export const refereeRest = (settings: ScheduleSettings) => settings.refereeRestMinutes ?? settings.restMinutes ?? 30
export function clubToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
export function clubNotBefore() {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
  return `${clubToday()}T${time}`
}
export function defaultScheduleSettings(division: string, startDate: string, endDate: string): ScheduleSettings {
  return { startDate, endDate, weekdays: [6], dayPriority: [6], avoidedWeekdays: [0, 3], dayStart: '09:00', dayEnd: '15:00', kickoffTimes: '',
    fields: [...(PDSA_FIELD_GROUPS[division] ?? [])],
    turnaroundMinutes: 10, coachRestMinutes: 30, refereeRestMinutes: 30, gamesPerTeamPerDay: 1, minimumDaysBetweenGames: 0, cycles: 1, blockedDates: [] }
}
export const priorityDays = (settings: ScheduleSettings) => settings.dayPriority ?? settings.weekdays
export function timeMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(time.trim())
  if (!match) return NaN
  let hour = Number(match[1]); const minute = Number(match[2])
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) return NaN
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)
  return hour * 60 + minute
}
export const clockTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
export function displayTime(time: string) {
  const minutes = timeMinutes(time)
  if (!Number.isFinite(minutes)) return time
  const hour = Math.floor(minutes / 60)
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}
export function hasRecordedPlay(game: MatchResource) {
  return !!(game.actualStartedAt || game.actualEndedAt || game.finalized || game.homeScore || game.awayScore || game.homeSigned || game.awaySigned || game.homePlayers || game.awayPlayers || game.homeSignature?.length || game.awaySignature?.length)
}
const dateValue = (date: string) => {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T12:00:00Z`) : NaN
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date ? value : NaN
}
export function validateSettings(settings: ScheduleSettings, division: string): string[] {
  const errors: string[] = []
  const span = (dateValue(settings.endDate) - dateValue(settings.startDate)) / 86_400_000
  if (!Number.isFinite(span) || span < 0 || span > 366) errors.push('Choose a valid date range of no more than 367 days.')
  const priority = priorityDays(settings)
  if (!priority.length || priority.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || new Set(priority).size !== priority.length) errors.push('Choose a primary match day and unique alternative days.')
  if ((settings.avoidedWeekdays ?? []).some((day) => !Number.isInteger(day) || day < 0 || day > 6)) errors.push('Check the avoided weekdays.')
  if (priority.some((day) => settings.avoidedWeekdays?.includes(day))) errors.push('A priority day is also marked Avoid. Remove it from one of the lists.')
  const start = timeMinutes(settings.dayStart); const end = timeMinutes(settings.dayEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < (matchTiming(division).total + (settings.extraMatchMinutes ?? 0))) errors.push('The daily field window must fit a complete PDSA match, including breaks.')
  if (!settings.fields.length || settings.fields.some((field) => !field.trim()) || new Set(settings.fields.map(normalizeField)).size !== settings.fields.length) errors.push('Enter unique field names.')
  if (settings.fieldAvailability && settings.fields.some((name) => !settings.fieldAvailability!.some((field) => normalizeField(field.id) === normalizeField(name) && field.divisions.includes(division)))) errors.push('Select fields assigned to this division on the PDSA map.')
  for (const [value, min, max, label] of [[settings.extraMatchMinutes ?? 0, 0, 120, 'Extra match minutes'], [settings.turnaroundMinutes, 0, 120, 'Turnaround'], [coachRest(settings), 0, 240, 'Coach rest'], [refereeRest(settings), 0, 240, 'Referee rest'], [settings.gamesPerTeamPerDay, 1, 4, 'Games per team per day'], [settings.minimumDaysBetweenGames ?? 0, 0, 30, 'Days between team matches'], [settings.cycles, 1, 4, 'Round-robin cycles']] as const) {
    if (!Number.isInteger(value) || value < min || value > max) errors.push(`${label} must be a whole number between ${min} and ${max}.`)
  }
  if (settings.kickoffTimes.trim() && settings.kickoffTimes.split(',').some((time) => !Number.isFinite(timeMinutes(time)) || timeMinutes(time) < start || timeMinutes(time) + matchTiming(division).total + (settings.extraMatchMinutes ?? 0) > end)) errors.push('Each kickoff must be a valid time within the field window and leave room to finish the match.')
  if (settings.blockedDates.some((date) => !Number.isFinite(dateValue(date)))) errors.push('Unavailable dates must use YYYY-MM-DD.')
  if (settings.scheduleBreaks?.some(entry=>validateScheduleBreak(entry).length)) errors.push('Correct the holiday/break dates in Admin Schedule.')
  return errors
}
export function roundRobin(division: string, coaches: string[], cycles: number): MatchPair[] {
  const teams = [...new Set(coaches.map((name) => name.trim()).filter(Boolean))]
  if (teams.length < 2 || teams.length > 30 || !Number.isInteger(cycles) || cycles < 1 || cycles > 4) throw new Error('Select 2–30 head coaches and 1–4 round-robin cycles.')
  const pairs: MatchPair[] = []
  for (let cycle = 0; cycle < cycles; cycle++) {
    const circle: (string | null)[] = [...teams, ...(teams.length % 2 ? [null] : [])]
    for (let round = 0; round < circle.length - 1; round++) {
      for (let index = 0; index < circle.length / 2; index++) {
        const a = circle[index]; const b = circle[circle.length - 1 - index]
        if (!a || !b) continue
        const reverse = (cycle + round + index) % 2 === 1
        pairs.push({ id: `${division}-${cycle}-${round}-${index}`, division, homeCoach: reverse ? b : a, awayCoach: reverse ? a : b, round: cycle * (circle.length - 1) + round + 1 })
      }
      circle.splice(1, 0, circle.pop()!)
    }
  }
  return pairs
}
export function availableSlots(settings: ScheduleSettings, division: string, notBefore: string): MatchSlot[] {
  if (validateSettings(settings, division).length) return []
  const timing = { ...matchTiming(division), total: matchTiming(division).total + (settings.extraMatchMinutes ?? 0) }; const slots: MatchSlot[] = []
  const times: number[] = settings.kickoffTimes.trim() ? [...new Set(settings.kickoffTimes.split(',').map(timeMinutes))].sort((a, b) => a - b) : []
  if (!times.length) for (let minute = timeMinutes(settings.dayStart); minute + timing.total <= timeMinutes(settings.dayEnd); minute += timing.total + settings.turnaroundMinutes) times.push(minute)
  for (let day = dateValue(settings.startDate); day <= dateValue(settings.endDate); day += 86_400_000) {
    const date = new Date(day).toISOString().slice(0, 10)
    const weekday = new Date(day).getUTCDay()
    if (date < notBefore.slice(0, 10) || !priorityDays(settings).includes(weekday) || settings.avoidedWeekdays?.includes(weekday) || scheduleDateBlocked(settings,date,division)) continue
    for (const minute of times) {
      if (date === notBefore.slice(0, 10) && notBefore.includes('T') && minute < timeMinutes(notBefore.slice(11, 16))) continue
      for (const field of settings.fields) {
        const slot = { date, kickoff: clockTime(minute), field, durationMinutes: timing.total, turnaroundMinutes: settings.turnaroundMinutes, coachRestMinutes: coachRest(settings), refereeRestMinutes: refereeRest(settings) }
        if (fieldAvailable(slot, division, settings.fieldAvailability)) slots.push(slot)
      }
    }
  }
  return slots.sort((a, b) => priorityDays(settings).indexOf(new Date(a.date + 'T12:00:00Z').getUTCDay()) - priorityDays(settings).indexOf(new Date(b.date + 'T12:00:00Z').getUTCDay()) || a.date.localeCompare(b.date) || a.kickoff.localeCompare(b.kickoff))
}
const normalize = (text: string) => text.trim().toLowerCase()
const normalizeField = (text: string) => normalize(text).replace(/^field\s+/, '')
const coachesFor = (game: { homeCoach: string; awayCoach: string; homeAssistantCoach?: string; awayAssistantCoach?: string }) => [game.homeCoach, game.awayCoach, game.homeAssistantCoach, game.awayAssistantCoach].filter((name): name is string => !!name?.trim()).map(normalize)
const overlaps = (start: number, end: number, otherStart: number, otherEnd: number) => start < otherEnd && otherStart < end
export function fieldAvailable(slot: MatchSlot, division: string, fields?: ClubField[]) {
  if (!fields) return true // Saved isolated planning inputs remain readable; the Admin UI always supplies the catalog.
  const field = fields.find((entry) => normalizeField(entry.id) === normalizeField(slot.field))
  if (!field?.active || !field.divisions.includes(division) || field.unavailableDates.includes(slot.date)) return false
  const day = new Date(slot.date + 'T12:00:00Z').getUTCDay()
  const start = timeMinutes(slot.kickoff); const end = start + slot.durationMinutes
  if (field.availability.length && !field.availability.some((window) => window.weekdays.includes(day) && (!window.startDate || slot.date >= window.startDate) && (!window.endDate || slot.date <= window.endDate) && start >= timeMinutes(window.startTime) && end <= timeMinutes(window.endTime))) return false
  return !field.closures.some((closure) => closure.date === slot.date && (!closure.startTime || overlaps(start, end, timeMinutes(closure.startTime), timeMinutes(closure.endTime))))
}
export function slotFits(pair: MatchPair, slot: MatchSlot, games: MatchResource[], settings: ScheduleSettings) {
  if (scheduleDateBlocked(settings,slot.date,pair.division)) return false
  if (!fieldAvailable(slot, pair.division, settings.fieldAvailability)) return false
  const start = timeMinutes(slot.kickoff); const end = start + slot.durationMinutes
  const coaches = coachesFor(pair)
  const candidateReferee = normalize(pair.referee ?? '')
  if (candidateReferee && coaches.includes(candidateReferee)) return false
  const minimumDays = settings.minimumDaysBetweenGames ?? 0
  if (minimumDays > 0) {
    const teams = [pair.homeCoach, pair.awayCoach].map(normalize)
    if (games.some((game) => game.id !== pair.id && game.division === pair.division && game.scheduleStatus !== 'cancelled' && game.scheduleStatus !== 'postponed' && [game.homeCoach, game.awayCoach].some((coach) => teams.includes(normalize(coach))) && Math.abs(dateValue(game.date) - dateValue(slot.date)) / 86_400_000 < minimumDays)) return false
  }
  const dayGames = games.filter((game) => game.date === slot.date && game.scheduleStatus !== 'cancelled' && game.scheduleStatus !== 'postponed' && game.id !== pair.id)
  for (const coach of [pair.homeCoach, pair.awayCoach]) {
    const dailyGames = dayGames.filter((game) => game.division === pair.division && [game.homeCoach, game.awayCoach].map(normalize).includes(normalize(coach))).length
    if (dailyGames >= settings.gamesPerTeamPerDay) return false
  }
  for (const game of dayGames) {
    const otherCoaches = coachesFor(game)
    const sharesCoach = coaches.some((coach) => otherCoaches.includes(coach))
    const otherStart = timeMinutes(game.kickoff ?? game.time)
    const otherDuration = game.durationMinutes ?? (game.division ? matchTiming(game.division).total : 90)
    const sameField = !game.field || normalizeField(game.field) === normalizeField(slot.field)
    const sharesReferee = !!candidateReferee && (pair.refereeId && game.refereeId ? pair.refereeId === game.refereeId : candidateReferee === normalize(game.referee ?? ''))
    const refereeAlsoCoaching = !!candidateReferee && otherCoaches.includes(candidateReferee)
    const coachAlsoRefereeing = !!game.referee?.trim() && coaches.includes(normalize(game.referee))
    if (!Number.isFinite(otherStart)) { if (sameField || sharesCoach || sharesReferee || refereeAlsoCoaching || coachAlsoRefereeing) return false; continue }
    if (sameField && overlaps(start, end + slot.turnaroundMinutes, otherStart, otherStart + otherDuration + (game.turnaroundMinutes ?? settings.turnaroundMinutes))) return false
    const otherCoachRest = game.coachRestMinutes ?? coachRest(settings)
    const otherRefereeRest = game.refereeRestMinutes ?? refereeRest(settings)
    if (sharesCoach && overlaps(start, end + coachRest(settings), otherStart, otherStart + otherDuration + otherCoachRest)) return false
    if (sharesReferee && overlaps(start, end + refereeRest(settings), otherStart, otherStart + otherDuration + otherRefereeRest)) return false
    if (refereeAlsoCoaching && overlaps(start, end + refereeRest(settings), otherStart, otherStart + otherDuration + otherCoachRest)) return false
    if (coachAlsoRefereeing && overlaps(start, end + coachRest(settings), otherStart, otherStart + otherDuration + otherRefereeRest)) return false
  }
  return true
}
export function planMatches(pairs: MatchPair[], games: MatchResource[], settings: ScheduleSettings, notBefore: string) {
  const bookedByDate = new Map<string, MatchResource[]>()
  for (const game of games) {
    const day = bookedByDate.get(game.date) ?? []
    day.push(game); bookedByDate.set(game.date, day)
  }
  const placed: { pair: MatchPair; slot: MatchSlot }[] = []; const unplaced: MatchPair[] = []
  const slotsByDivision = new Map<string, MatchSlot[]>()
  for (const pair of pairs) {
    const slotKey = pair.division + ':' + (pair.durationMinutes ?? '')
    let slots = slotsByDivision.get(slotKey)
    if (!slots) { slots = availableSlots(pair.durationMinutes ? {...settings,extraMatchMinutes:Math.max(0,pair.durationMinutes-matchTiming(pair.division).total)} : settings, pair.division, notBefore); slotsByDivision.set(slotKey, slots) }
    const slot = slots.find((candidate) => {
      const nearbyGames: MatchResource[] = []
      const range = Math.max(0, (settings.minimumDaysBetweenGames ?? 0) - 1)
      for (let offset = -range; offset <= range; offset++) {
        const date = offset === 0 ? candidate.date : new Date(dateValue(candidate.date) + offset * 86_400_000).toISOString().slice(0, 10)
        nearbyGames.push(...(bookedByDate.get(date) ?? []))
      }
      return slotFits(pair, candidate, nearbyGames, settings)
    })
    if (!slot) { unplaced.push(pair); continue }
    placed.push({ pair, slot })
    const day = bookedByDate.get(slot.date) ?? []
    day.push({ ...pair, ...slot, time: displayTime(slot.kickoff), scheduleStatus: 'scheduled' }); bookedByDate.set(slot.date, day)
  }
  return { placed, unplaced }
}
