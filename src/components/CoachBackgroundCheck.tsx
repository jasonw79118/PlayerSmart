import { useState } from 'react'
import { backgroundCheckStatus, type CoachBackgroundCheck as Check } from '../lib/coach-background-checks'
import { clubToday } from '../lib/match-scheduler'

export function CoachBackgroundCheck({ coach, cycleLabel, record, firstPractice = '', administrator, onChange, role = 'coach', minimumConductedOn = '' }: {
  coach: string; cycleLabel: string; record?: Check; firstPractice?: string; administrator: boolean; onChange: (date: string | null) => void; role?: 'coach' | 'referee'; minimumConductedOn?: string
}) {
  const [conductedOn, setConductedOn] = useState(record?.conductedOn ?? '')
  const today = clubToday()
  const status = record?.conductedOn && record.conductedOn < minimumConductedOn ? 'New fall background check required' : backgroundCheckStatus(record, firstPractice, today)
  return <div className="assistant-verification" aria-label={`Background check for ${coach}`}>
    <strong>{coach} — Club background check: {status}</strong>
    <small>{cycleLabel}. A new check is required every fall before the {role === 'referee' ? "referee's first practice or duty" : "coach's first practice"}.</small>
    {firstPractice && <small>{role === 'referee' ? 'First practice / duty' : 'First practice'}: {firstPractice}</small>}
    {administrator && <>
      <label>Check conducted on<input aria-label={`Background check conducted on for ${coach}`} type="date" value={record?.conductedOn ?? conductedOn} min={minimumConductedOn || undefined} max={today} disabled={!!record?.conductedOn} onChange={(event) => setConductedOn(event.target.value)} /></label>
      <label><input type="checkbox" aria-label={`Club background check complete for ${coach}`} checked={!!record?.conductedOn} disabled={!record?.conductedOn && (!conductedOn || conductedOn > today || conductedOn < minimumConductedOn)} onChange={(event) => onChange(event.target.checked ? conductedOn : null)} />Verified against club records for {cycleLabel}</label>
    </>}
    {record?.conductedOn && <small>Conducted {record.conductedOn}. Verified {new Date(record.verifiedAt).toLocaleDateString()} by {record.verifiedBy}.</small>}
    {record && !record.conductedOn && <small>Record the conducted date and reverify this earlier entry.</small>}
  </div>
}
