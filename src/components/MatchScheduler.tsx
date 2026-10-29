import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { fieldAvailable, priorityDays, coachRest, refereeRest, availableSlots, clubNotBefore, clubToday, clockTime, defaultScheduleSettings, displayTime, hasRecordedPlay, matchTiming, planMatches, roundRobin, slotFits, timeMinutes, timingSource, validateSettings, type MatchPair, type MatchSlot, type ScheduleSettings, type ScheduleStatus } from '../lib/match-scheduler'
import { assignAvailableReferees, refereeCandidates, type RefereeProfile } from '../lib/referees'
import { defaultClubFields, type ClubField } from '../lib/fields'
import { breaksOnDate, type ScheduleBreak } from '../lib/schedule-breaks'
import type { TournamentSetup } from '../lib/tournament'
import type { ScoreGame } from '../lib/score-game'
import './MatchScheduler.css'

type Staff = { headCoach: string; assistantCoach: string; teamNickname: string; jerseyColor: string }
type Preview = { title: string; gamesAtBuild: string; setupAtBuild: string; changes: ScoreGame[]; unplaced: string[]; unassigned?: string[] }
type DivisionControls = { managedId: string; reason: string; blockDate: boolean; closureDate: string; alternativeDay?: string }
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const sortedGames = (games: ScoreGame[]) => [...games].sort((a, b) => a.date.localeCompare(b.date) || timeMinutes(a.kickoff ?? a.time) - timeMinutes(b.kickoff ?? b.time) || (a.field ?? '').localeCompare(b.field ?? ''))
const pairFor = (game: ScoreGame): MatchPair => ({ id: game.id, division: game.division!, homeCoach: game.homeCoach, awayCoach: game.awayCoach, homeAssistantCoach: game.homeAssistantCoach, awayAssistantCoach: game.awayAssistantCoach, referee: game.referee, refereeId: game.refereeId, round: game.scheduleRound, durationMinutes: game.durationMinutes })
const changeStatus = (game: ScoreGame, status: ScheduleStatus, reason: string, slot?: MatchSlot): ScoreGame => ({ ...game, ...slot,
  ...(slot ? { time: displayTime(slot.kickoff) } : {}), scheduleStatus: status, scheduleReason: reason,
  scheduleHistory: [...(game.scheduleHistory ?? []), { date: game.date, time: game.time, field: game.field, status: game.scheduleStatus ?? 'scheduled', reason, changedAt: new Date().toISOString() }],
})

export function MatchScheduler({ divisions, coaches, teamCounts, staff, games, setGames, settingsByDivision, setSettings, seasonStart, seasonEnd, referees = [], fields = defaultClubFields(), fallRenewalDay = '08-01', tournamentSetups = {}, scheduleBreaks = [] }: {
  scheduleBreaks?: ScheduleBreak[]; tournamentSetups?: Record<string,TournamentSetup>; fallRenewalDay?: string; fields?: ClubField[]; referees?: RefereeProfile[]; divisions: string[]; coaches: Record<string, string[]>; teamCounts: Record<string, number>; staff: Record<string, Staff>
  games: ScoreGame[]; setGames: Dispatch<SetStateAction<ScoreGame[]>>; settingsByDivision: Record<string, ScheduleSettings>; setSettings: Dispatch<SetStateAction<Record<string, ScheduleSettings>>>; seasonStart: string; seasonEnd: string
}) {
  const tabsId = useId()
  const [settingsOpen,setSettingsOpen]=useState(false)
  const [dayControlsOpen,setDayControlsOpen]=useState(false)
  const [phaseFilter,setPhaseFilter]=useState('all')
  const [statusFilter,setStatusFilter]=useState('all')
  const managedPanelRef=useRef<HTMLElement>(null)
  const manageTrigger=useRef<HTMLButtonElement>(null)
  const [division, setDivision] = useState(divisions.includes('U10') ? 'U10' : divisions[0])
  const settings: ScheduleSettings = { ...(settingsByDivision[division] ?? defaultScheduleSettings(division, seasonStart > clubToday() ? seasonStart : clubToday(), seasonEnd)), fieldAvailability: fields, fallRenewalDay, scheduleBreaks }
  const daysInOrder = priorityDays(settings)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [refereeChoices, setRefereeChoices] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [controlsByDivision, setControls] = useState<Record<string, DivisionControls>>({})
  const controls = controlsByDivision[division] ?? { managedId: '', reason: 'Weather', blockDate: true, closureDate: clubToday() }
  const { managedId, reason, blockDate, closureDate } = controls
  function configureControls(changes: Partial<DivisionControls>) {
    setControls((current) => ({ ...current, [division]: { ...controls, ...changes } }))
  }
  function selectDivision(next: string) {
    setDivision(next); setPreview(null); setNotice(''); setPhaseFilter('all'); setStatusFilter('all')
  }
  const divisionGames = sortedGames(games.filter((game) => game.division === division))
  const visibleGames=divisionGames.filter(game=>(phaseFilter==='all' || (game.phase ?? 'regular')===phaseFilter) && (statusFilter==='all' || (game.finalized ? 'final' : game.scheduleStatus ?? 'scheduled')===statusFilter))
  useEffect(()=>{managedPanelRef.current?.focus()},[managedId])
  const regularGames = divisionGames.filter(game=>game.phase !== 'tournament')
  const managed = games.find((game) => game.id === managedId && game.division === division)
  const selectedCoaches = coaches[division] ?? []
  const errors = validateSettings(settings, division)
  const resourceGames = games.map((game) => {
    const divisionSettings = game.division ? settingsByDivision[game.division] ?? defaultScheduleSettings(game.division, seasonStart, seasonEnd) : settings
    return { ...game, coachRestMinutes: game.coachRestMinutes ?? coachRest(divisionSettings), refereeRestMinutes: game.refereeRestMinutes ?? refereeRest(divisionSettings) }
  })
  const setupFingerprint = JSON.stringify({ settings, settingsByDivision, tournamentSetups, division, coaches: selectedCoaches, teamCounts, staff, referees })
  const previewStale = !!preview && (preview.gamesAtBuild !== JSON.stringify(games) || preview.setupAtBuild !== setupFingerprint)
  const matchMinutes = matchTiming(division)
  function configure(changes: Partial<ScheduleSettings>) {
    const next = { ...settings, ...changes }
    delete next.fieldAvailability
    delete next.fallRenewalDay
    delete next.scheduleBreaks
    setSettings((current) => ({ ...current, [division]: next }))
    setPreview(null)
  }
  function team(coach: string): Staff {
    return staff[`${division}:${coach}`] ?? { headCoach: coach, assistantCoach: '', teamNickname: coach, jerseyColor: '#2878d0' }
  }
  function createGame(pair: MatchPair, slot: MatchSlot): ScoreGame {
    const home = team(pair.homeCoach); const away = team(pair.awayCoach)
    return { ...slot, id: pair.id, division, scheduleRound: pair.round, scheduleStatus: 'scheduled', time: displayTime(slot.kickoff),
      homeTeam: home.teamNickname || pair.homeCoach, awayTeam: away.teamNickname || pair.awayCoach, homeCoach: pair.homeCoach, awayCoach: pair.awayCoach,
      homeAssistantCoach: home.assistantCoach, awayAssistantCoach: away.assistantCoach, homeColor: home.jerseyColor, awayColor: away.jerseyColor,
      homeScore: 0, awayScore: 0, homePlayers: 0, awayPlayers: 0, referee: '', homeSignatureName: '', awaySignatureName: '', homeSignedAt: '', awaySignedAt: '', homeSigned: false, awaySigned: false, finalized: false }
  }
  function buildSchedule() {
    if (errors.length || divisionGames.some(game=>game.phase === 'tournament') || regularGames.length || selectedCoaches.length !== teamCounts[division] || selectedCoaches.length < 2) return
    const pairs = roundRobin(division, selectedCoaches, settings.cycles).map((pair) => ({ ...pair, id: `schedule-${crypto.randomUUID()}`, homeAssistantCoach: team(pair.homeCoach).assistantCoach, awayAssistantCoach: team(pair.awayCoach).assistantCoach }))
    const plan = planMatches(pairs, resourceGames, settings, clubNotBefore())
    const assigned = assignAvailableReferees(plan.placed.map(({ pair, slot }) => createGame(pair, slot)), resourceGames, referees, settings)
    setPreview({ title: 'New division schedule', gamesAtBuild: JSON.stringify(games), setupAtBuild: setupFingerprint,
      changes: assigned.games, unassigned: assigned.unassigned, unplaced: plan.unplaced.map((pair) => `${pair.homeCoach} vs ${pair.awayCoach}`) })
    setNotice('Review the schedule below before applying it.')
  }
  function recordChange(status: 'postponed' | 'cancelled') {
    if (!managed || hasRecordedPlay(managed) || !reason.trim()) return
    setGames((current) => current.map((game) => {
      if (hasRecordedPlay(game)) return game
      if (game.id === managed.id) return changeStatus(game, status, reason.trim())
      if (blockDate && game.division === division && game.date === managed.date && game.scheduleStatus !== 'cancelled' && game.scheduleStatus !== 'postponed') return changeStatus(game, 'postponed', reason.trim())
      return game
    }))
    if (blockDate) configure({ blockedDates: [...new Set([...settings.blockedDates, managed.date])] })
    else setPreview(null)
    setNotice(`Match ${status}.${blockDate ? ' Other unplayed matches on this division date were postponed, and the date is unavailable.' : ''} Replacement suggestions respect the division's dates, fields, breaks and team availability.`)
  }
  function postponeDay() {
    if (!closureDate || !reason.trim()) return
    const affected = divisionGames.filter((game) => game.date === closureDate && !hasRecordedPlay(game) && game.scheduleStatus !== 'cancelled' && game.scheduleStatus !== 'postponed')
    const ids = new Set(affected.map((game) => game.id))
    setGames((current) => current.map((game) => ids.has(game.id) && !hasRecordedPlay(game) ? changeStatus(game, 'postponed', reason.trim()) : game))
    configure({ blockedDates: [...new Set([...settings.blockedDates, closureDate])] })
    setNotice(`${affected.length} ${division} matches postponed; ${closureDate} is unavailable for this division. Matches with recorded play were preserved. Build a revised schedule below.`)
  }
  const suggestions = managed && !hasRecordedPlay(managed) && (managed.scheduleStatus === 'postponed' || managed.scheduleStatus === 'cancelled') && !errors.length
    ? availableSlots({...settings,...(managed.phase === 'tournament' && tournamentSetups[division] ? {startDate:tournamentSetups[division].startDate,endDate:tournamentSetups[division].endDate} : {}),extraMatchMinutes:managed.phase === 'tournament' ? Math.max(20,(managed.durationMinutes ?? 0)-matchTiming(division).total) : 0}, division, clubNotBefore()).filter((slot) => !(slot.date === managed.date && slot.kickoff === managed.kickoff && slot.field === managed.field) && (managed.phase !== 'tournament' || !games.some(g => (g.tournamentId === managed.tournamentId && (g.tournamentRound ?? 0) < (managed.tournamentRound ?? 0) || managed.tournamentRound === 1 && g.division === division && g.phase !== 'tournament' && g.scheduleStatus !== 'cancelled') && g.date >= slot.date)) && slotFits(pairFor(managed), slot, resourceGames, settings)).slice(0, 3) : []
  function previewReplacement(slot: MatchSlot) {
    if (!managed || hasRecordedPlay(managed)) return
    const assigned = assignAvailableReferees([changeStatus(managed, 'scheduled', `Rescheduled: ${managed.scheduleReason || reason}`, slot)], resourceGames, referees, settings)
    setPreview({ title: 'Replacement match', gamesAtBuild: JSON.stringify(games), setupAtBuild: setupFingerprint, changes: assigned.games, unassigned: assigned.unassigned, unplaced: [] })
  }
  function reworkSchedule() {
    if (errors.length) return
    const movable = divisionGames.filter((game) => game.phase !== 'tournament' && !hasRecordedPlay(game) && (game.scheduleStatus === 'postponed' || game.id === managedId && game.scheduleStatus === 'cancelled' || game.scheduleStatus !== 'cancelled' && game.date >= clubToday()))
    if (!movable.length) { setNotice('There are no unplayed matches to reschedule.'); return }
    const ids = new Set(movable.map((game) => game.id))
    const plan = planMatches(movable.map(pairFor), resourceGames.filter((game) => !ids.has(game.id)), settings, clubNotBefore())
    const assigned = assignAvailableReferees(plan.placed.map(({ pair, slot }) => changeStatus(movable.find((game) => game.id === pair.id)!, 'scheduled', 'Schedule revised after availability changes', slot)), resourceGames, referees, settings)
    setPreview({ title: 'Revised division schedule', gamesAtBuild: JSON.stringify(games), setupAtBuild: setupFingerprint,
      changes: assigned.games, unassigned: assigned.unassigned,
      unplaced: plan.unplaced.map((pair) => `${pair.homeCoach} vs ${pair.awayCoach}`) })
    setNotice('Review all proposed dates. Tournament matches use Admin Fields repair. Other divisions, completed matches, and scorecards with recorded play stay in place. Cancelled matches stay cancelled unless selected for replacement.')
  }
  function previewRefereeAssignments() {
    if (errors.length) return
    const proposed = divisionGames.filter((game) => !hasRecordedPlay(game) && game.date >= clubToday() && game.scheduleStatus !== 'cancelled' && game.scheduleStatus !== 'postponed')
    const assigned = assignAvailableReferees(proposed, resourceGames, referees, settings)
    setPreview({ title: 'Referee assignments', gamesAtBuild: JSON.stringify(games), setupAtBuild: setupFingerprint, changes: assigned.games, unplaced: [], unassigned: assigned.unassigned })
  }
  function previewReferee(game: ScoreGame) {
    if (hasRecordedPlay(game) || errors.length) return
    const chosen = refereeChoices[game.id] ?? game.refereeId ?? referees.find((referee) => referee.name === game.referee)?.id ?? ''
    const referee = refereeCandidates(game, resourceGames, referees, settings).find((profile) => profile.id === chosen)
    if (chosen && !referee) { setNotice('This referee is unavailable or has a scheduling conflict. Choose another referee or update availability in Admin Referees.'); return }
    setPreview({ title: 'Referee assignment', gamesAtBuild: JSON.stringify(games), setupAtBuild: setupFingerprint, changes: [{ ...game, refereeId: referee?.id, referee: referee?.name ?? '', coachRestMinutes: coachRest(settings), refereeRestMinutes: refereeRest(settings) }], unplaced: [], unassigned: referee ? [] : [game.homeTeam + ' vs ' + game.awayTeam] })
  }
  function refereeEditor(game: ScoreGame) {
    if(game.scheduleStatus==='cancelled' || game.scheduleStatus==='postponed')return null
    const candidates=refereeCandidates(game,resourceGames,referees,settings)
    const selectedId=refereeChoices[game.id] ?? game.refereeId ?? referees.find(profile=>profile.name===game.referee)?.id ?? (game.referee ? 'unlisted' : '')
    return <div className="schedule-actions"><label>Referee<select aria-label={`Referee for match ${game.id}`} value={selectedId} onChange={event=>setRefereeChoices(current=>({...current,[game.id]:event.target.value}))}><option value="">Unassigned</option>{selectedId && !candidates.some(profile=>profile.id===selectedId) && <option value={selectedId} disabled>{game.referee || 'Unavailable referee'} (review availability)</option>}{candidates.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><button className="button-secondary" aria-label={`Preview referee for match ${game.id}`} onClick={()=>previewReferee(game)}>Preview referee assignment</button></div>
  }
  function applyPreview() {
    if (!preview || previewStale || preview.unplaced.length || !preview.changes.length) return
    const changes = new Map(preview.changes.map((game) => [game.id, game]))
    let applied = false
    setGames((current) => {
      if (JSON.stringify(current) !== preview.gamesAtBuild) return current
      applied = true
      const existing = new Set(current.map((game) => game.id))
      return [...current.map((game) => changes.get(game.id) ?? game), ...preview.changes.filter((game) => !existing.has(game.id))]
    })
    setNotice(applied ? `${preview.changes.length} matches scheduled. Referee match lists and GameCards now use these fixtures.` : 'The schedule changed. Build a fresh preview before applying.')
    setRefereeChoices({})
    setPreview(null)
  }
  return <section className="panel match-scheduler" aria-labelledby="scheduler-heading">
    <div className="division-schedule-tabs" role="tablist" aria-label="Division schedules">{divisions.map((ageGroup, index) => <button type="button" role="tab" key={ageGroup} id={tabsId + '-tab-' + index} aria-selected={ageGroup === division} aria-controls={tabsId + '-panel'} tabIndex={ageGroup === division ? 0 : -1} onClick={() => selectDivision(ageGroup)} onKeyDown={(event) => {
      let nextIndex: number
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % divisions.length
      else if (event.key === 'ArrowLeft') nextIndex = (index + divisions.length - 1) % divisions.length
      else if (event.key === 'Home') nextIndex = 0
      else if (event.key === 'End') nextIndex = divisions.length - 1
      else return
      event.preventDefault()
      selectDivision(divisions[nextIndex])
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
    }}>{ageGroup}</button>)}</div>
    <div className="division-schedule-panel" role="tabpanel" id={tabsId + '-panel'} aria-labelledby={tabsId + '-tab-' + divisions.indexOf(division)}>
    <div className="schedule-division-heading"><div><p className="eyebrow">DIVISION SCHEDULE</p><h2 id="scheduler-heading">{division} matches</h2><p>{divisionGames.length} matches / {selectedCoaches.length} of {teamCounts[division]} teams configured</p></div><button type="button" className="button-secondary" aria-expanded={settingsOpen} aria-controls={tabsId+'-settings'} onClick={()=>setSettingsOpen(!settingsOpen)}>{settingsOpen ? 'Close scheduling settings' : 'Edit scheduling settings'}</button></div>
    <dl className="schedule-summary"><div><dt>Season dates</dt><dd>{settings.startDate} <span>to</span> {settings.endDate}</dd></div><div><dt>Match day &amp; hours</dt><dd>{weekdays[daysInOrder[0]] ?? 'Choose a day'} / {displayTime(settings.dayStart)} - {displayTime(settings.dayEnd)}</dd></div><div><dt>Fields &amp; duration</dt><dd>{settings.fields.join(', ') || 'No fields'} / {matchMinutes.total} min <span>including breaks</span></dd></div></dl>
    <section className="schedule-settings-editor" aria-label={division+' scheduling settings'} id={tabsId+'-settings'} hidden={!settingsOpen}><div className="division-settings-heading"><h3>{division} scheduling controls</h3><p>Settings save as you edit and apply only to this division.</p></div>
      <section className="schedule-setting-group"><h4>Dates &amp; kickoff times</h4><div className="schedule-controls">      <label>First match date<input aria-label="First match date" type="date" value={settings.startDate} onChange={(event) => configure({ startDate: event.target.value })} /></label>
      <label>Last match date<input aria-label="Last match date" type="date" value={settings.endDate} onChange={(event) => configure({ endDate: event.target.value })} /></label>
      <label>Earliest kickoff<input aria-label="Earliest kickoff" type="time" value={settings.dayStart} onChange={(event) => configure({ dayStart: event.target.value })} /></label>
      <label>Field closes<input aria-label="Field closes" type="time" value={settings.dayEnd} onChange={(event) => configure({ dayEnd: event.target.value })} /></label>
      <label>Kickoff times (optional)<input aria-label="Specific kickoff times" value={settings.kickoffTimes} onChange={(event) => configure({ kickoffTimes: event.target.value })} placeholder="09:00,10:15,11:30" /><small>Blank: calculate starts from match length and turnaround.</small></label>
</div></section>
      <section className="schedule-setting-group"><h4>Fields &amp; match spacing</h4><fieldset className="schedule-weekdays" aria-label="Available division fields"><legend>Available fields for {division}</legend>{fields.filter((field) => field.divisions.includes(division)).map((field) => <label key={field.id}><input type="checkbox" aria-label={`Use field ${field.id}`} checked={settings.fields.some((id) => id.toLowerCase() === field.id.toLowerCase())} disabled={!field.active && !settings.fields.some((id) => id.toLowerCase() === field.id.toLowerCase())} onChange={(event) => configure({ fields: event.target.checked ? [...settings.fields, field.id] : settings.fields.filter((id) => id.toLowerCase() !== field.id.toLowerCase()) })} />Field {field.id}{!field.active && ' (closed)'}</label>)}<small>Hours and closures are set in Admin Fields and apply across divisions.</small></fieldset>
<div className="schedule-controls">      <label>Turnaround minutes<input aria-label="Turnaround minutes" type="number" min="0" max="120" value={settings.turnaroundMinutes} onChange={(event) => configure({ turnaroundMinutes: Number(event.target.value) })} /></label>
      <label>Coach rest minutes<input aria-label="Coach rest minutes" type="number" min="0" max="240" value={coachRest(settings)} onChange={(event) => configure({ coachRestMinutes: Number(event.target.value) })} /></label><label>Referee rest minutes<input aria-label="Referee rest minutes" type="number" min="0" max="240" value={refereeRest(settings)} onChange={(event) => configure({ refereeRestMinutes: Number(event.target.value) })} /></label>
      <label>Games per team per day<input aria-label="Games per team per day" type="number" min="1" max="4" value={settings.gamesPerTeamPerDay} onChange={(event) => configure({ gamesPerTeamPerDay: Number(event.target.value) })} /></label>
      <label>Minimum days between team matches<input aria-label="Minimum days between team matches" type="number" min="0" max="30" value={settings.minimumDaysBetweenGames ?? 0} onChange={(event) => configure({ minimumDaysBetweenGames: Number(event.target.value) })} /><small>Calendar days between match dates for this age group. Zero permits same-day games within the daily limit.</small></label>
</div></section>
          <section className="schedule-day-priority" aria-label="Match day priorities"><h3>Match day priority for {division}</h3><p>Use the primary day first; alternatives are tried in order.</p>
      <label>Primary match day<select aria-label="Primary match day" value={daysInOrder[0] ?? ''} onChange={(event) => { const next = [Number(event.target.value), ...daysInOrder.slice(1).filter((day) => day !== Number(event.target.value))]; configure({ dayPriority: next, weekdays: next }) }}><option value="" disabled>Choose a primary day</option>{weekdays.map((day, index) => <option key={day} value={index} disabled={settings.avoidedWeekdays?.includes(index)}>{day}</option>)}</select></label>
      <h4>Alternative priority days</h4><ol>{daysInOrder.slice(1).map((day, index) => <li key={day}><span>{weekdays[day]}</span><button type="button" className="button-secondary" aria-label={`Move ${weekdays[day]} earlier`} disabled={index === 0} onClick={() => { const next = [...daysInOrder]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; configure({ dayPriority: next, weekdays: next }) }}>Earlier</button><button type="button" className="button-secondary" aria-label={`Move ${weekdays[day]} later`} disabled={index === daysInOrder.length - 2} onClick={() => { const next = [...daysInOrder]; [next[index + 1], next[index + 2]] = [next[index + 2], next[index + 1]]; configure({ dayPriority: next, weekdays: next }) }}>Later</button><button type="button" className="button-secondary" aria-label={`Remove alternative ${weekdays[day]}`} onClick={() => { const next = daysInOrder.filter((value) => value !== day); configure({ dayPriority: next, weekdays: next }) }}>Remove</button></li>)}</ol>
      <div className="schedule-actions"><label>Alternative day<select aria-label="Alternative match day" value={controls.alternativeDay ?? ''} onChange={(event) => configureControls({ alternativeDay: event.target.value })}><option value="">Choose a day</option>{weekdays.map((day, index) => <option key={day} value={index} disabled={daysInOrder.includes(index) || settings.avoidedWeekdays?.includes(index)}>{day}</option>)}</select></label><button type="button" className="button-secondary" disabled={!controls.alternativeDay || daysInOrder.includes(Number(controls.alternativeDay)) || settings.avoidedWeekdays?.includes(Number(controls.alternativeDay))} onClick={() => { const next = [...daysInOrder, Number(controls.alternativeDay)]; configure({ dayPriority: next, weekdays: next }); configureControls({ alternativeDay: '' }) }}>Add alternative day</button></div>
      <fieldset className="schedule-weekdays"><legend>Days to avoid completely</legend>{weekdays.map((day, index) => <label key={day}><input type="checkbox" aria-label={`Avoid ${day}`} checked={settings.avoidedWeekdays?.includes(index) ?? false} onChange={(event) => { const avoided = event.target.checked ? [...(settings.avoidedWeekdays ?? []), index] : (settings.avoidedWeekdays ?? []).filter((value) => value !== index); const next = daysInOrder.filter((value) => !avoided.includes(value)); configure({ avoidedWeekdays: avoided, dayPriority: next, weekdays: next }) }} />{day}</label>)}</fieldset><small>Avoided days stay unavailable for regular games and makeups.</small>
    </section>

      <section className="schedule-setting-group"><h4>Season format &amp; extra unavailable dates</h4><div className="schedule-controls">      <label>Round-robin cycles<select aria-label="Round-robin cycles" value={settings.cycles} onChange={(event) => configure({ cycles: Number(event.target.value) })}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} — each opponent {count === 1 ? 'once' : `${count} times`}</option>)}</select></label>
      <label>Unavailable division dates<input aria-label="Unavailable division dates" value={settings.blockedDates.join(',')} onChange={(event) => configure({ blockedDates: event.target.value ? event.target.value.split(',').map((date) => date.trim()) : [] })} placeholder="2026-11-07,2026-11-14" /></label>
</div><small>Club holidays and school breaks are managed in Holidays &amp; breaks.</small></section>
          <details className="schedule-rule"><summary>{division}: {matchMinutes.total} minutes including breaks</summary><span>{matchMinutes.description}. Add {settings.turnaroundMinutes} minutes between field bookings.</span><small>{timingSource}. Timing changes or extra water breaks need Board/referee review; reserve additional turnaround as needed.</small></details>

      <button type="button" className="button-secondary schedule-settings-done" onClick={()=>setSettingsOpen(false)}>Done editing settings</button>
    </section>
    {errors.length > 0 && <ul className="schedule-errors" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
    <div className="schedule-actions">{!divisionGames.length && <button className="button-primary" disabled={!!errors.length || divisionGames.some(game=>game.phase === 'tournament') || regularGames.length > 0 || selectedCoaches.length < 2 || selectedCoaches.length !== teamCounts[division]} onClick={buildSchedule}>Build schedule preview</button>}{divisionGames.length>0 && <><button className="button-secondary" disabled={!!errors.length || !divisionGames.length} onClick={reworkSchedule}>Rework remaining schedule</button><button className="button-secondary" disabled={!!errors.length || !divisionGames.length || !referees.length} onClick={previewRefereeAssignments}>Assign available referees</button></>}</div>

    {notice && <p className="schedule-notice" role="status">{notice}</p>}
    {preview && <section className="schedule-preview" aria-label="Schedule preview"><h3>{preview.title}</h3><p>{preview.changes.length} proposed matches. No proposed changes take effect until applied.</p>{previewStale && <p role="alert">Settings or fixtures changed. Build a fresh preview.</p>}{preview.unplaced.length > 0 && <div role="alert"><p>{preview.unplaced.length} matches could not fit. Extend the dates, hours or field availability and rebuild; the schedule will stay unchanged.</p><ul>{preview.unplaced.map((pair, index) => <li key={index}>{pair}</li>)}</ul></div>}
      <div className="schedule-table-wrap"><table className="schedule-table"><thead><tr><th>Match</th><th>Current slot / referee</th><th>Proposed slot / referee</th></tr></thead><tbody>{preview.changes.map((game) => { const old = games.find((match) => match.id === game.id); return <tr key={game.id}><th>{game.homeTeam} vs {game.awayTeam}</th><td>{old ? `${old.date} ${old.time} · Field ${old.field} (${old.scheduleStatus ?? 'scheduled'}) - ${old.referee || 'Unassigned'}` : 'New fixture'}</td><td>{game.date} {game.time} · Field {game.field}<br />Referee: {game.referee || 'Unassigned'}</td></tr> })}</tbody></table></div>
      <>{!!preview.unassigned?.length && <details><summary>{preview.unassigned.length} matches still need a referee</summary><p>Add or update availability in Admin Referees, or adjust division kickoff times and referee rest. Unassigned fixtures can still be scheduled.</p><ul>{preview.unassigned.map((match, index) => <li key={index}>{match}</li>)}</ul></details>}</><div className="schedule-actions"><button className="button-primary" disabled={previewStale || !!preview.unplaced.length || !preview.changes.length} onClick={applyPreview}>Apply schedule</button><button className="button-secondary" onClick={() => setPreview(null)}>Discard preview</button></div></section>}
    {managed && !hasRecordedPlay(managed) && <section ref={managedPanelRef} tabIndex={-1} className="schedule-management" aria-label="Manage selected match"><button type="button" className="text-button schedule-close-match" onClick={()=>{configureControls({managedId:''});manageTrigger.current?.focus()}}>Close match details</button><h3>{managed.homeTeam} vs {managed.awayTeam}</h3><p>{managed.date} · {managed.time} · Field {managed.field} · {managed.scheduleStatus}</p><label className="schedule-check"><input type="checkbox" checked={blockDate} onChange={(event) => configureControls({ blockDate: event.target.checked })} />Close this date for {division} and postpone its other unplayed matches</label><div className="schedule-controls"><label>Change reason<input aria-label="Schedule change reason" value={reason} onChange={event=>configureControls({reason:event.target.value})} maxLength={240}/></label></div>{refereeEditor(managed)}<div className="schedule-actions"><button className="button-secondary" disabled={!reason.trim()} onClick={() => recordChange('postponed')}>Postpone match</button><button className="button-secondary" disabled={!reason.trim()} onClick={() => recordChange('cancelled')}>Cancel match</button></div>
      {(managed.scheduleStatus === 'cancelled' || managed.scheduleStatus === 'postponed') && <><h4>Suggested replacement slots</h4>{suggestions.length ? <ul className="schedule-suggestions">{suggestions.map((slot) => <li key={`${slot.date}-${slot.kickoff}-${slot.field}`}><span>{slot.date} · {displayTime(slot.kickoff)} · Field {slot.field}</span><button className="button-secondary" onClick={() => previewReplacement(slot)}>Preview this replacement</button></li>)}</ul> : <p>No free replacement slots fit. Widen the dates, hours or fields, or rework the remaining schedule.</p>}</>}
      {managed.scheduleHistory?.length ? <details><summary>Schedule change history</summary>{managed.scheduleHistory.map((entry, index) => <p key={index}>{entry.date} {entry.time} · Field {entry.field} · {entry.status} · {entry.reason}</p>)}</details> : null}
    </section>}
    <div className="schedule-match-toolbar"><div><h3>Division matches</h3><span>{visibleGames.length} of {divisionGames.length} shown</span></div><div className="schedule-match-filters"><label>Competition<select aria-label="Filter matches by competition" value={phaseFilter} onChange={event=>setPhaseFilter(event.target.value)}><option value="all">All competitions</option><option value="regular">Regular season</option><option value="tournament">Tournament</option></select></label><label>Status<select aria-label="Filter matches by status" value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="scheduled">Scheduled</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option><option value="final">Final</option></select></label></div></div>
    <div className="schedule-table-wrap"><table className="schedule-table"><caption>{division} fixtures</caption><thead><tr><th>Date / kickoff</th><th>Field / finish</th><th>Teams</th><th>Status</th><th>Referee</th><th>Actions</th></tr></thead><tbody>{visibleGames.map((game) => {
      return <tr key={game.id}><td>{game.date}<br />{game.time}</td><td>{game.field || 'Unassigned'}<br />{game.kickoff && displayTime(clockTime(timeMinutes(game.kickoff) + (game.durationMinutes ?? matchMinutes.total)))}</td><td>{game.phase === 'tournament' && <strong>Tournament round {game.tournamentRound}<br /></strong>}{game.homeTeam} ({game.homeCoach})<br />vs {game.awayTeam} ({game.awayCoach})</td><td>{game.finalized ? 'Final' : game.scheduleStatus ?? 'scheduled'}{game.scheduleReason && <small>{game.scheduleReason}</small>}{breaksOnDate(scheduleBreaks,game.date,division).length>0 && <small>No-game period: {breaksOnDate(scheduleBreaks,game.date,division).map(b=>b.name).join(', ')} - review and reschedule</small>}{!fieldAvailable({ date: game.date, kickoff: game.kickoff ?? game.time, field: game.field ?? '', durationMinutes: game.durationMinutes ?? matchMinutes.total, turnaroundMinutes: game.turnaroundMinutes ?? 0 }, division, fields) && <small>Field unavailable - use Admin Fields to repair schedules</small>}{hasRecordedPlay(game) && !game.finalized && <small>Recorded play — manual review required</small>}</td><td>{game.referee || <span className="schedule-referee-needed">Unassigned</span>}</td><td><button className="button-secondary" disabled={hasRecordedPlay(game)} aria-label={`Manage match ${game.id}`} onClick={(event) => { manageTrigger.current=event.currentTarget; configureControls({ managedId: game.id }); setPreview(null) }}>Manage</button></td></tr> })}</tbody></table>{!visibleGames.length && <p className="schedule-empty-state">{divisionGames.length ? 'No matches match these filters. Choose another status or competition.' : 'No matches scheduled yet. Review division settings, then build a schedule preview.'}</p>}</div>
    <details className="schedule-closure" open={dayControlsOpen}><summary onClick={event=>{event.preventDefault();setDayControlsOpen(!dayControlsOpen)}}>Postpone a division match day</summary><div hidden={!dayControlsOpen}><div className="schedule-controls"><label>Date to close<input aria-label="Date to postpone" type="date" value={closureDate} onChange={(event) => configureControls({ closureDate: event.target.value })} /></label><label>Reason<input aria-label="Day closure reason" value={reason} onChange={(event) => configureControls({ reason: event.target.value })} maxLength={240} /></label></div><button className="button-secondary" disabled={!closureDate || !reason.trim()} onClick={postponeDay}>Postpone division match day</button><small>Applies to {division}. Close other affected divisions separately.</small></div></details>
    </div>
  </section>
}
