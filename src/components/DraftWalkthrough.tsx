import { useEffect, useState } from 'react'
import { Clock3, Pause, Play, ShieldCheck, Users } from 'lucide-react'
import { snakeDraftCoach } from '../lib/draft-order'
import { CoachDraftBoard, rankedCoachBoard } from './CoachDraftBoard'
import { TeamBalanceBoard, TeamEvaluationSummary } from './TeamEvaluation'
import { playerLetterGrade } from '../lib/evaluation'
import { compareAthletes } from '../lib/athlete-order'
import './DraftWalkthrough.css'

const coaches = [
  { id: 'avery', name: 'Avery Hill', team: 'Blue Comets', color: '#5aa3ff' },
  { id: 'morgan', name: 'Morgan Reed', team: 'Gold Eagles', color: '#e9b44c' },
  { id: 'sam', name: 'Sam Patel', team: 'Green Strikers', color: '#52bc83' },
  { id: 'casey', name: 'Casey Young', team: 'Red Rockets', color: '#ed7676' },
  { id: 'riley', name: 'Riley Stone', team: 'Purple Falcons', color: '#ba8af0' },
] as const
type CoachId = typeof coaches[number]['id']
type Perspective = 'compare' | 'administrator' | CoachId
type Status = 'ready' | 'running' | 'paused' | 'complete'
const names = ['Jordan Lee', 'Casey Rivera', 'Taylor Brooks', 'Riley Morgan', 'Alex Chen', 'Jamie Parker', 'Sam Carter', 'Quinn Davis', 'Avery James', 'Drew Wilson', 'Emery Stone', 'Finley Reed', 'Hayden Blake', 'Logan Ellis', 'Peyton Cruz', 'Reese Young', 'Rowan Bell', 'Skyler Hayes', 'Adrian Flores', 'Blake Cooper', 'Cameron Scott', 'Dakota Miller', 'Elliot Brooks', 'Frankie Allen', 'Harper King', 'Indigo Moore', 'Jules Turner', 'Kai Bennett', 'Lane Foster', 'Micah Collins', 'Nico Ramirez', 'Oakley Adams', 'Parker Evans', 'Remy Torres', 'Sage Phillips', 'Tatum Wright', 'Val Rivera', 'Wren Mitchell', 'Yael Brooks', 'Zion Walker']
const playerPool = names.map((name, index) => {
  const score = (9.4 - index * 0.09).toFixed(1)
  const number = [...names].sort((left, right) => compareAthletes({ name: left }, { name: right })).indexOf(name) + 1
  return { id: `draft-player-${index}`, name, number, score, division: 'U10', letterGrade: playerLetterGrade(Number(score), [Number(score)]), strength: ['First touch', 'Passing', 'Awareness', 'Teamwork', 'Ball control', 'Effort'][index % 6] }
})
const evaluationPoints = (players: typeof playerPool) => players.map((player) => ({ grade: player.letterGrade, score: Number(player.score) }))
const alphabeticalPool = [...playerPool].sort(compareAthletes)
type Pick = { playerId: string; coachId: CoachId; enteredBy: 'coach' | 'administrator' }
const rosterTarget = playerPool.length / coaches.length
const pickSeconds = 90
const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export function DraftWalkthrough({ onClose }: { onClose: () => void }) {
  const [perspective, setPerspective] = useState<Perspective>('compare')
  const [order, setOrder] = useState<CoachId[]>(coaches.map((coach) => coach.id))
  const [picks, setPicks] = useState<Pick[]>([])
  const [status, setStatus] = useState<Status>('ready')
  const [remaining, setRemaining] = useState(pickSeconds)
  const [selected, setSelected] = useState<Partial<Record<CoachId, string>>>({})
  const [shortlists, setShortlists] = useState<Record<CoachId, string[]>>({ avery: [], morgan: [], sam: [], casey: [], riley: [] })
  const [notes, setNotes] = useState<Record<CoachId, string>>({ avery: 'Build a team around confident passers.', morgan: 'Prioritize awareness and effort for the next selection.', sam: 'Look for players comfortable receiving under pressure.', casey: 'Build around teamwork and positive communication.', riley: 'Balance ball control with strong effort.' })
  const [entryMode, setEntryMode] = useState<'administrator' | 'coach'>('administrator')
  const [adminChoice, setAdminChoice] = useState('')
  const [announcement, setAnnouncement] = useState('Five coaches and 40 players are ready. Arrange the order, then start the draft.')
  const activeCoachId = snakeDraftCoach(order, picks.length)!
  const activeCoach = coaches.find((coach) => coach.id === activeCoachId)!
  const drafted = new Set(picks.map((pick) => pick.playerId))
  const available = playerPool.filter((player) => !drafted.has(player.id))
  const latestPick = picks.at(-1)
  const latestPlayer = latestPick && playerPool.find((player) => player.id === latestPick.playerId)
  const latestCoach = latestPick && coaches.find((coach) => coach.id === latestPick.coachId)

  useEffect(() => {
    if (status !== 'running' || remaining === 0) return
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [status, remaining === 0])

  function plannedPlayer(coachId: CoachId) {
    return available.find((player) => player.id === selected[coachId])
      ?? rankedCoachBoard(available, shortlists[coachId]).find((player) => shortlists[coachId].includes(player.id))
  }
  function pick(coachId: CoachId, enteredBy: Pick['enteredBy']) {
    const player = enteredBy === 'administrator' ? available.find((entry) => entry.id === adminChoice) : plannedPlayer(coachId)
    if (!player || drafted.has(player.id) || coachId !== activeCoachId || status !== 'running' || remaining === 0 || entryMode !== enteredBy) return
    const next = [...picks, { playerId: player.id, coachId, enteredBy }]
    setPicks(next)
    setRemaining(pickSeconds)
    setSelected((current) => ({ ...current, [coachId]: undefined }))
    setAdminChoice('')
    const nextCoach = coaches.find((coach) => coach.id === snakeDraftCoach(order, next.length))!
    setAnnouncement(`Pick ${next.length}: ${player.name} assigned to ${activeCoach.team} (${activeCoach.name}), recorded by ${enteredBy === 'administrator' ? 'Jordan Ellis' : activeCoach.name}.${next.length < playerPool.length ? ` ${nextCoach.name} is now on the clock.` : ' All 40 players are assigned.'}`)
    if (next.length === playerPool.length) setStatus('complete')
  }
  function runNextRound() {
    if (status !== 'running' || remaining === 0) return
    const next = [...picks]
    for (const player of available.slice(0, coaches.length)) next.push({ playerId: player.id, coachId: snakeDraftCoach(order, next.length)!, enteredBy: 'administrator' })
    setPicks(next); setRemaining(pickSeconds); setSelected({}); setAdminChoice('')
    setAnnouncement(`${next.length - picks.length} walkthrough picks recorded in evaluation order. ${next.length} of 40 players assigned.`)
    if (next.length === playerPool.length) setStatus('complete')
  }
  function reset() {
    setPicks([]); setStatus('ready'); setRemaining(pickSeconds); setSelected({}); setAdminChoice('')
    setAnnouncement('Draft reset. The administrator can arrange the order and start the draft.')
  }
  function undo() {
    if (!picks.length || status === 'running') return
    const removed = picks.at(-1)!
    setPicks((current) => current.slice(0, -1)); setStatus('paused'); setRemaining(pickSeconds)
    setAdminChoice(''); setSelected({})
    setAnnouncement(`Last pick reversed: ${playerPool.find((player) => player.id === removed.playerId)!.name} is available again.`)
  }
  function roster(coachId: CoachId) {
    return picks.filter((pick) => pick.coachId === coachId).map((pick) => playerPool.find((player) => player.id === pick.playerId)!).sort(compareAthletes)
  }
  function coachView(coach: typeof coaches[number]) {
    const onTurn = activeCoachId === coach.id && status !== 'complete'
    const choice = plannedPlayer(coach.id)
    const canPick = entryMode === 'coach' && onTurn && status === 'running' && remaining > 0 && Boolean(choice)
    return <section className={`draft-seat ${onTurn ? 'draft-seat-active' : ''}`} aria-label={`Coach ${coach.name} view`} key={coach.id}>
      <header><span className="draft-seat-role"><Users size={16} />COACH</span><h2>{coach.name}</h2><p><i style={{ background: coach.color }} />{coach.team} · U10</p></header>
      <div className={`draft-seat-turn ${onTurn ? 'draft-seat-your-turn' : ''}`} role="status">{status === 'complete' ? 'Draft ended' : status === 'ready' ? 'Waiting for the administrator to start' : status === 'paused' ? 'Draft paused' : remaining === 0 ? 'Clock expired — waiting for administrator' : onTurn ? 'Your turn — choose a player' : `Waiting for ${activeCoach.name}`}</div>
      {latestPlayer && latestCoach && <aside className="draft-seat-latest"><strong>Latest confirmed pick</strong><p>{latestPlayer.name} → {latestCoach.team}</p><small>Pick {picks.length} · Recorded by {latestPick?.enteredBy === 'administrator' ? 'administrator' : latestCoach.name}</small></aside>}
      <div className="draft-seat-roster"><h3>Your roster <span>{roster(coach.id).length} / {rosterTarget}</span></h3><TeamEvaluationSummary coach={coach.name} players={evaluationPoints(roster(coach.id))} />{roster(coach.id).length ? <ul>{roster(coach.id).map((player) => <li key={player.id}><span>#{player.number} {player.name}<small>{player.division} · Grade {player.letterGrade}</small></span><strong>{player.score}/10</strong></li>)}</ul> : <p>Your selections will appear here.</p>}</div>
      <CoachDraftBoard coach={coach.name} available={available} preferences={shortlists[coach.id]} selectedId={choice?.id} disabled={status === 'complete'} onSelect={(id) => setSelected((current) => ({ ...current, [coach.id]: id }))} onPreferencesChange={(ids) => { setShortlists((current) => ({ ...current, [coach.id]: ids })); setSelected((current) => ({ ...current, [coach.id]: ids[0] })) }} />
      <div className="draft-seat-confirm"><p>{choice ? `Selected: ${choice.name}` : 'Choose a player to plan your selection.'}</p>{entryMode === 'coach' ? <button className="button-primary" disabled={!canPick} onClick={() => pick(coach.id, 'coach')}>Confirm pick for {coach.team}</button> : <p className="draft-coach-entry-help">{onTurn ? 'Tell the administrator your choice. Jordan Ellis records the official pick for your team.' : 'The administrator records each coach’s choice when their turn arrives.'}</p>}<small>{onTurn && entryMode === 'coach' ? 'Confirming assigns the player and advances the turn.' : 'You can plan your next selection while you wait.'}</small></div>
      <details className="draft-seat-notes"><summary>Your shortlist and notes</summary><p>Visible in your individual coach view.</p><ul>{shortlists[coach.id].map((id) => { const player = playerPool.find((entry) => entry.id === id)!; return <li key={id}>{player.name}{drafted.has(id) ? ' · Drafted' : ''}</li> })}</ul><label>Coaching notes<textarea aria-label={`Private notes for ${coach.name}`} value={notes[coach.id]} onChange={(event) => setNotes((current) => ({ ...current, [coach.id]: event.target.value }))} rows={3} /></label></details>
    </section>
  }

  return <section className="draft-walkthrough" aria-label="Draft walkthrough">
    <header className="draft-walkthrough-heading"><div><p className="eyebrow">U10 · 5 COACHES · 40 PLAYERS · 8 PER TEAM</p><h1>Inside the draft room</h1><p>One practice draft, viewed by its administrator and five coaches. Arrange the order, start the clock and work through all 40 picks.</p></div><button className="button-secondary" onClick={onClose}>Return to draft workspace</button></header>
    {perspective !== 'compare' && perspective !== 'administrator' && <nav className="draft-view-switcher" aria-label="Administrator coach preview"><strong>Administrator preview: {coaches.find((coach) => coach.id === perspective)?.name}</strong><button className="button-secondary" onClick={() => setPerspective('administrator')}>Back to administrator</button><button className="button-secondary" onClick={() => setPerspective('compare')}>Compare all views</button></nav>}
    <div className="draft-perspectives" role="group" aria-label="Draft perspective">{([{ id: 'compare', label: 'Compare all six' }, { id: 'administrator', label: 'Administrator' }, ...coaches.map((coach) => ({ id: coach.id, label: `Coach ${coach.name}` }))] as Array<{ id: Perspective; label: string }>).map((view) => <button key={view.id} aria-pressed={perspective === view.id} onClick={() => setPerspective(view.id)}>{view.label}</button>)}</div>
    <div className="draft-room-status"><div><span>{status === 'complete' ? 'ENDED' : status.toUpperCase()}</span><strong>{status === 'complete' ? 'Draft complete' : status === 'ready' ? 'Ready to start' : `Round ${Math.floor(picks.length / coaches.length) + 1} · Pick ${picks.length + 1}`}</strong><p>{status === 'complete' ? `${picks.length} players assigned · ${available.length} unassigned` : `${activeCoach.name} · ${activeCoach.team} is next`}</p></div><div className={`draft-room-clock ${remaining === 0 ? 'draft-clock-expired' : ''}`}><Clock3 size={19} /><strong aria-label="Pick clock">{timeLabel(remaining)}</strong><small>{status === 'paused' ? 'Paused' : 'Per pick · no automatic selection'}</small></div></div>
    <p className="draft-room-announcement" role="status">{announcement}</p>
    <div className={`draft-seats ${perspective === 'compare' ? 'draft-seats-compare' : 'draft-seats-single'}`}>
      {(perspective === 'compare' || perspective === 'administrator') && <section className="draft-seat draft-administrator" aria-label="Draft administrator view">
        <header><span className="draft-seat-role"><ShieldCheck size={16} />DRAFT ADMINISTRATOR</span><h2>Jordan Ellis</h2><p>Sets turn order and records the current coach’s choice</p></header>
        <section className="draft-admin-pick" aria-label="Administrator pick entry"><h3>Record the coach’s pick</h3><label>Pick entry method<select aria-label="Pick entry method" value={entryMode} disabled={status === 'running'} onChange={(event) => { setEntryMode(event.target.value as typeof entryMode); setAdminChoice('') }}><option value="administrator">Administrator records coach choices</option><option value="coach">Coaches confirm their own picks</option></select></label><small>Pause the draft to change the entry method.</small>{entryMode === 'administrator' && <><p>Recording for <strong>{activeCoach.name} · {activeCoach.team}</strong></p><label>Coach’s chosen player<select aria-label="Player to record for current coach" value={available.some((player) => player.id === adminChoice) ? adminChoice : ''} disabled={status !== 'running' || remaining === 0} onChange={(event) => setAdminChoice(event.target.value)}><option value="">Select an available player</option>{[...available].sort(compareAthletes).map((player) => <option key={player.id} value={player.id}>#{player.number} {player.name} · {player.score}</option>)}</select></label><button className="button-primary" disabled={status !== 'running' || remaining === 0 || !available.some((player) => player.id === adminChoice)} onClick={() => pick(activeCoachId, 'administrator')}>Record pick for {activeCoach.team}</button><small>Assigns the player to this coach, updates every view and advances the snake draft turn.</small></>}</section>
        <h3>Draft controls</h3><div className="draft-room-controls">{status === 'ready' ? <button className="button-primary" onClick={() => { setStatus('running'); setAnnouncement('Draft started. The first coach is on the clock.') }}><Play size={15} />Start draft</button> : status === 'running' ? <button className="button-primary" onClick={() => setStatus('paused')}><Pause size={15} />Pause draft</button> : status === 'paused' ? <button className="button-primary" onClick={() => setStatus('running')}><Play size={15} />Resume draft</button> : null}<button className="button-secondary" disabled={status === 'ready' || status === 'complete'} onClick={() => { setStatus('complete'); setAnnouncement('The administrator ended the draft.') }}>End draft</button><button className="button-secondary" disabled={!picks.length || status === 'running'} onClick={undo}>Undo last pick</button><button className="button-secondary" disabled={status === 'complete'} onClick={() => setRemaining(pickSeconds)}>Reset pick clock</button><button className="button-secondary" onClick={reset}>Reset walkthrough</button></div>
        <div className="draft-seat-order"><h3>Pick order</h3><ol>{order.map((id, index) => { const coach = coaches.find((entry) => entry.id === id)!; return <li className="draft-order-row" key={id}><span>{index + 1}. {coach.name}</span><button aria-label={`Move ${coach.name} earlier`} disabled={status !== 'ready' || index === 0} onClick={() => setOrder((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next })}>↑</button><button aria-label={`Move ${coach.name} later`} disabled={status !== 'ready' || index === order.length - 1} onClick={() => setOrder((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next })}>↓</button></li> })}</ol><p>Snake draft: the order reverses each round. The coach at each end gets consecutive picks.</p><button className="button-secondary" disabled={status !== 'ready'} onClick={() => setOrder((current) => [...current].reverse())}>Reverse starting order</button><small>Reset to arrange the order before starting.</small></div>
        <TeamBalanceBoard division="U10" divisionPlayers={evaluationPoints(playerPool)} teams={coaches.map((coach) => ({ coach: coach.name, players: evaluationPoints(roster(coach.id)) }))} /><h3>Team progress</h3><ul className="draft-team-progress">{coaches.map((coach) => <li key={coach.id}><span>{coach.team}<small>{coach.name}</small></span><strong>{roster(coach.id).length} / {rosterTarget}</strong></li>)}</ul>
        <div className="draft-run-round"><button className="button-secondary" disabled={status !== 'running' || remaining === 0} onClick={runNextRound}>Run next 5 picks</button><small>Walkthrough shortcut: assigns the next five available players in evaluation order. Use individual pick entry to try a coach’s actual choice.</small></div>
        <p className="draft-admin-help">Pause before reversing a pick. Expired clocks wait for an administrator; a player is never chosen automatically.</p>
      </section>}
      {coaches.filter((coach) => perspective === 'compare' || perspective === coach.id).map(coachView)}
    </div>
    <section className="panel draft-room-activity" aria-label="Shared draft activity"><div><h2>Shared draft activity</h2><p>Every coach sees the player, assigned team and next turn. Private planning belongs to each coach’s view.</p></div>{picks.length ? <ol>{[...picks].reverse().map((pick, index) => { const player = playerPool.find((entry) => entry.id === pick.playerId)!; const coach = coaches.find((entry) => entry.id === pick.coachId)!; return <li key={pick.playerId}><span>Pick {picks.length - index}</span><strong>{player.name}</strong><span>{coach.team} · {coach.name}<small>Entered by {pick.enteredBy === 'administrator' ? 'Jordan Ellis' : coach.name}</small></span></li> })}</ol> : <p>No selections yet.</p>}</section>
    <section className="panel draft-public-board" aria-label="Shared player board"><h2>All 40 players</h2><p>Drafted rows stay visible with their team and pick number. Only available players can be selected.</p><div><table><thead><tr><th>Player</th><th>Average</th><th>Assigned team</th><th>Pick</th></tr></thead><tbody>{alphabeticalPool.map((player) => { const index = picks.findIndex((pick) => pick.playerId === player.id); const coach = index >= 0 ? coaches.find((entry) => entry.id === picks[index].coachId) : undefined; return <tr key={player.id} className={coach ? 'draft-public-taken' : ''}><th scope="row">#{player.number} {player.name}</th><td>{player.score}</td><td>{coach ? `${coach.team} · ${coach.name}` : 'Available'}</td><td>{index >= 0 ? index + 1 : '—'}</td></tr> })}</tbody></table></div></section>
  </section>
}
