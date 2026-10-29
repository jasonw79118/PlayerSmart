export type ScheduleBreak = { id: string; name: string; startDate: string; endDate: string; includeFollowingWeekend: boolean; divisions: string[] }
const dateValue = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN
  const value = Date.parse(date+'T12:00:00Z')
  return Number.isFinite(value) && new Date(value).toISOString().slice(0,10) === date ? value : NaN
}
export function validateScheduleBreak(entry: ScheduleBreak): string[] {
  const span = (dateValue(entry.endDate)-dateValue(entry.startDate))/86400000
  return [...(!entry.name.trim() ? ['Enter a holiday or break name.'] : []), ...(!Number.isFinite(span) || span<0 || span>366 ? ['Choose valid start and end dates, no more than a year apart.'] : [])]
}
export function breakEndDate(entry: ScheduleBreak) {
  const value = dateValue(entry.endDate)
  if (!Number.isFinite(value) || !entry.includeFollowingWeekend) return entry.endDate
  const weekday = new Date(value).getUTCDay()
  // A break already ending on Sunday includes that weekend, not an extra week.
  return new Date(value + (7-weekday)%7*86400000).toISOString().slice(0,10)
}
export function breaksOnDate(breaks: ScheduleBreak[], date: string, division: string) {
  return breaks.filter(entry => (!entry.divisions.length || entry.divisions.includes(division)) && breakDateRanges(entry).some(range=>date>=range.startDate && date<=range.endDate))
}
export function breakDateRanges(entry: ScheduleBreak) {
  const ranges=[{startDate:entry.startDate,endDate:entry.endDate}]
  const value=dateValue(entry.endDate)
  if(entry.includeFollowingWeekend && Number.isFinite(value) && new Date(value).getUTCDay()!==0) {
    const saturday=new Date(value+(6-new Date(value).getUTCDay())*86400000).toISOString().slice(0,10)
    ranges.push({startDate:saturday,endDate:breakEndDate(entry)})
  }
  return ranges
}
