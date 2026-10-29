import { timeMinutes } from './match-scheduler'

export type FieldWindow = { id: string; weekdays: number[]; startTime: string; endTime: string; startDate: string; endDate: string }
export type FieldClosure = { id: string; date: string; startTime: string; endTime: string; reason: string }
export type ClubField = { id: string; divisions: string[]; active: boolean; disabledReason?: string; availability: FieldWindow[]; unavailableDates: string[]; closures: FieldClosure[] }
export { PDSA_FIELD_GROUPS } from './field-layout'
export function defaultClubFields(): ClubField[] {
  return ['3', '4', '5', '7A', '6', '7', '1A', '1', '2', '8'].map((id) => ({ id, divisions: id === '8' ? ['U12', 'U14', 'U18'] : ['3', '4', '5'].includes(id) ? ['U6'] : ['7A', '6', '7'].includes(id) ? ['U8 Boys', 'U8 Girls'] : ['U10'], active: true, availability: [], unavailableDates: [], closures: [] }))
}
export function validFieldDate(date: string) {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date + 'T12:00:00Z') : NaN
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date
}
export function validateField(field: ClubField) {
  const errors: string[] = []
  if (field.unavailableDates.some((date) => !validFieldDate(date))) errors.push('Enter valid unavailable dates as YYYY-MM-DD.')
  for (const window of field.availability) {
    if (!window.weekdays.length || window.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) errors.push('Select days for every field availability window.')
    if (!Number.isFinite(timeMinutes(window.startTime)) || !Number.isFinite(timeMinutes(window.endTime)) || timeMinutes(window.startTime) >= timeMinutes(window.endTime)) errors.push('Field availability must end after it starts.')
    if (window.startDate && !validFieldDate(window.startDate) || window.endDate && !validFieldDate(window.endDate) || window.startDate && window.endDate && window.startDate > window.endDate) errors.push('Check the field availability dates.')
  }
  for (const closure of field.closures) {
    if (!validFieldDate(closure.date) || !closure.reason.trim()) errors.push('Every field closure needs a valid date and reason.')
    if (!!closure.startTime !== !!closure.endTime || closure.startTime && (!Number.isFinite(timeMinutes(closure.startTime)) || !Number.isFinite(timeMinutes(closure.endTime)) || timeMinutes(closure.startTime) >= timeMinutes(closure.endTime))) errors.push('A closure needs both start and end times, or leave both blank for the whole day.')
  }
  return [...new Set(errors)]
}
