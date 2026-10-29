import { useState, type Dispatch, type SetStateAction } from 'react'
import { nextTournamentRound, standings, tournamentProgress, type Tournament, type TournamentSetup } from '../lib/tournament'
import { clubNotBefore, defaultScheduleSettings, displayTime, planMatches, validateSettings, type ScheduleSettings } from '../lib/match-scheduler'
import { assignAvailableReferees, type RefereeProfile } from '../lib/referees'
import type { ScheduleBreak } from '../lib/schedule-breaks'
import type { ClubField } from '../lib/fields'
import type { ScoreGame } from '../lib/score-game'
import './MatchScheduler.css'

export function TournamentManager({ divisions, coaches, games, setGames, tournaments, setTournaments, setups, setSetups, settings, fields, referees, staff, seasonStart, seasonEnd, fallRenewalDay, scheduleBreaks = [] }: {
  scheduleBreaks?: ScheduleBreak[]; divisions: string[]; coaches: Record<string,string[]>; games: ScoreGame[]; setGames: Dispatch<SetStateAction<ScoreGame[]>>
  tournaments: Record<string,Tournament>; setTournaments: Dispatch<SetStateAction<Record<string,Tournament>>>
  setups: Record<string,TournamentSetup>; setSetups: Dispatch<SetStateAction<Record<string,TournamentSetup>>>
  settings: Record<string,ScheduleSettings>; fields: ClubField[]; referees: RefereeProfile[]; staff: Record<string,{ teamNickname: string; assistantCoach: string; jerseyColor: string }>
  seasonStart: string; seasonEnd: string; fallRenewalDay: string
}) {
  const [division,setDivision] = useState('U10')
  const [seedOrder,setSeedOrder] = useState<{order:string[];base:string} | null>(null)
  const [confirmedSeedData,setAcknowledged] = useState('')
  const [notice,setNotice] = useState('')
  const [preview,setPreview] = useState<{ games: ScoreGame[]; tournament: Tournament; base: string; issues: string[]; unassigned: string[] } | null>(null)
  const rows = standings(division,coaches[division] ?? [],games)
  const current = tournaments[division]
  const setup = setups[division] ?? {lossLimit:current?.lossLimit ?? 1,byeSeeds:current?.openingByes.map(c=>current.seeds.indexOf(c)+1).join(',') ?? '',startDate:current?.startDate ?? seasonEnd,endDate:current?.endDate ?? seasonEnd,extraMatchMinutes:current?.extraMatchMinutes ?? 20}
  const {lossLimit,byeSeeds,startDate:start,endDate:end,extraMatchMinutes:reserve} = setup
  function configure(patch: Partial<TournamentSetup>) {setSetups(c=>({...c,[division]:{...setup,...patch}}));setPreview(null)}
  const seedBase = JSON.stringify(rows)
  const order = seedOrder?.base === seedBase ? seedOrder.order : rows.map(r => r.coach)
  const seedFingerprint = JSON.stringify({rows,order})
  const acknowledged = confirmedSeedData === seedFingerprint
  const fingerprint = JSON.stringify({games,tournaments,setups,settings,fields,referees,staff,coaches,scheduleBreaks})
  const stale = !!preview && preview.base !== fingerprint
  const pendingRegular = games.some(g => g.division === division && g.phase !== 'tournament' && !g.finalized && g.scheduleStatus !== 'cancelled')
  function build() {
    try {
      if (!current && (rows.length < 2 || pendingRegular || !acknowledged)) throw new Error('Finish regular-season matches and confirm the seed order before starting. Every configured team is included.')
      const byeNumbers = byeSeeds.trim() ? byeSeeds.split(',').map(s => Number(s.trim())) : []
      if (!current && byeNumbers.some(n => !Number.isInteger(n) || n < 1 || n > order.length)) throw new Error('Enter valid opening bye seed numbers.')
      const tournament: Tournament = current ?? {id: crypto.randomUUID(),division,seeds:order,lossLimit,openingByes:byeNumbers.map(n => order[n-1]),startDate:start,endDate:end,extraMatchMinutes:reserve,rounds:[]}
      const round = nextTournamentRound(tournament,games)
      const config = {...(settings[division] ?? defaultScheduleSettings(division,seasonStart,seasonEnd)),startDate:start,endDate:end,fieldAvailability:fields,fallRenewalDay,scheduleBreaks,extraMatchMinutes:tournament.extraMatchMinutes ?? 20}
      const problems = validateSettings(config,division)
      if (!Number.isInteger(config.extraMatchMinutes) || config.extraMatchMinutes < 10) problems.push('Reserve at least 10 extra minutes for tournament overtime, plus a shootout allowance.')
      if (problems.length) throw new Error(problems.join(' '))
      const last = games.filter(g => g.tournamentId === tournament.id || !current && g.division === division && g.phase !== 'tournament' && g.scheduleStatus !== 'cancelled').map(g => g.date).sort().at(-1)
      // The next round starts on a later date, protecting the dependency even after rescheduling.
      const after = last ? new Date(Date.parse(last+'T12:00:00Z')+86400000).toISOString().slice(0,10) : start
      const notBefore = [clubNotBefore(), after+'T00:00',start+'T00:00'].sort().at(-1)!
      const pairs = round.pairs.map(p => ({...p,id:'tournament-'+crypto.randomUUID(),division,homeAssistantCoach:staff[division+':'+p.homeCoach]?.assistantCoach,awayAssistantCoach:staff[division+':'+p.awayCoach]?.assistantCoach}))
      const plan = planMatches(pairs,games,config,notBefore)
      const proposed: ScoreGame[] = plan.placed.map(({pair,slot}) => ({...slot,...pair,time:displayTime(slot.kickoff),phase:'tournament',tournamentId:tournament.id,tournamentRound:round.number,scheduleStatus:'scheduled',
        homeTeam:staff[division+':'+pair.homeCoach]?.teamNickname || pair.homeCoach,awayTeam:staff[division+':'+pair.awayCoach]?.teamNickname || pair.awayCoach,
        homeColor:staff[division+':'+pair.homeCoach]?.jerseyColor || '#2878d0',awayColor:staff[division+':'+pair.awayCoach]?.jerseyColor || '#d9333f',
        homeScore:0,awayScore:0,homePlayers:0,awayPlayers:0,referee:'',homeSignatureName:'',awaySignatureName:'',homeSignedAt:'',awaySignedAt:'',homeSigned:false,awaySigned:false,finalized:false}))
      const assigned = assignAvailableReferees(proposed,games,referees,config)
      setPreview({games:assigned.games,tournament:{...tournament,startDate:start,endDate:end,rounds:[...tournament.rounds,{number:round.number,byes:round.byes,gameIds:proposed.map(g=>g.id)}]},base:fingerprint,issues:plan.unplaced.map(p=>p.homeCoach+' vs '+p.awayCoach),unassigned:assigned.unassigned})
      setNotice('')
    } catch(error) { setNotice((error as Error).message); setPreview(null) }
  }
  const progress = current && tournamentProgress(current,games)
  return <section className="panel match-scheduler" aria-label="Tournament setup"><h2>Division tournaments</h2><div className="division-schedule-tabs">{divisions.map(d=><button key={d} aria-pressed={division===d} onClick={()=>{setDivision(d);setSeedOrder(null);setAcknowledged('');setPreview(null);setNotice('')}}>{d}</button>)}</div>
    <p>Every team participates. PDSA Appendix C: win 3 points, draw 1, loss 0; ties use goal difference, two-team head-to-head, then goals scored. Admin must resolve remaining seed ties.</p>
    <table className="schedule-table"><caption>{division} regular-season standings</caption><thead><tr><th>Seed</th><th>Coach</th><th>Played</th><th>W / L / D</th><th>Points</th><th>Goal difference</th><th>Seed review</th></tr></thead><tbody>{(current?.seeds ?? order).map((coach,i)=>{const r=rows.find(row=>row.coach===coach);return <tr key={coach}><td>{i+1}</td><td>{coach}</td><td>{r?.played ?? 0}</td><td>{r?.wins ?? 0} / {r?.losses ?? 0} / {r?.draws ?? 0}</td><td>{r?.points ?? 0}</td><td>{r ? r.goalsFor-r.goalsAgainst : 0}</td><td>{r?.tied && 'Tied: confirm order '}{!current && i>0 && r?.tied && rows.some(row=>row.coach===order[i-1] && row.tied && row.points===r.points && row.goalsFor-row.goalsAgainst===r.goalsFor-r.goalsAgainst && row.goalsFor===r.goalsFor) && <button onClick={()=>{const next=[...order];[next[i-1],next[i]]=[next[i],next[i-1]];setSeedOrder({order:next,base:seedBase});setAcknowledged('');setPreview(null)}}>Move seed up</button>}</td></tr>})}</tbody></table>
    {pendingRegular && !current && <p role="status">Regular-season results are still pending. Seeding opens when those cards are finalized or unplayed matches are cancelled.</p>}
    <div className="schedule-controls"><label>Losses before elimination<select disabled={!!current} value={current?.lossLimit ?? lossLimit} onChange={e=>{configure({lossLimit:Number(e.target.value)});setPreview(null)}}>{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>Tournament extra minutes (overtime and shootout)<input type="number" min="10" max="120" disabled={!!current} value={current?.extraMatchMinutes ?? reserve} onChange={e=>{configure({extraMatchMinutes:Number(e.target.value)});setPreview(null)}} /></label><label>Opening bye seed numbers<input disabled={!!current} value={current ? current.openingByes.map(c=>current.seeds.indexOf(c)+1).join(',') : byeSeeds} placeholder="1,2,3" onChange={e=>{configure({byeSeeds:e.target.value});setPreview(null)}} /></label><label>First tournament date<input type="date" value={start} onChange={e=>{configure({startDate:e.target.value});setPreview(null)}} /></label><label>Last tournament date<input type="date" value={end} onChange={e=>{configure({endDate:e.target.value});setPreview(null)}} /></label></div>
    <p>Opening byes must leave an even number of teams to play (for five teams, choose one or three bye seeds). Later odd-team rounds rotate byes by fewest prior byes, then seed. A bye does not count as a win. Teams play until only one remains below the loss limit. This is a round-based loss-limit format; opponents are paired after each round, avoiding rematches where possible.</p>
    <p>Fields, day priorities, coach/referee rest and daily limits use Admin Schedule settings for {division}. Each new round starts after the preceding round's match dates. Tournament slots include the extra time reserved above for overtime and a shootout. PDSA Appendix A requires two five-minute halves, then a shootout if still tied.</p>
    {!current && <label><input type="checkbox" checked={acknowledged} onChange={e=>{setAcknowledged(e.target.checked ? seedFingerprint : '');setPreview(null)}} />I confirm all teams and the final seed order, including unresolved ties.</label>}
    {current && <p>Round {current.rounds.length}. {progress?.alive.length} teams remain. {progress?.champion ? 'Champion: '+progress.champion : progress?.pending ? 'Waiting for finalized winners.' : 'Ready for the next round.'}</p>}
    {current?.rounds.map(r=><p key={r.number}>Round {r.number} byes: {r.byes.join(', ') || 'None'}</p>)}
    <button className="button-primary" disabled={!!progress?.pending || !!progress?.champion || !current && (!acknowledged || pendingRegular || rows.length<2)} onClick={build}>Preview {current ? 'next round' : 'opening round'}</button>
    {notice && <p role="alert">{notice}</p>}{preview && <section aria-label="Tournament schedule preview"><h3>Round {preview.tournament.rounds.length} preview</h3>{preview.games.map(g=><p key={g.id}>{g.date} {g.time} / Field {g.field}: {g.homeCoach} vs {g.awayCoach} / {g.referee || 'Referee needed'}</p>)}<p>Byes: {preview.tournament.rounds.at(-1)?.byes.join(', ') || 'None'}</p>{preview.issues.length>0 && <p role="alert">No slot for: {preview.issues.join('; ')}. Expand dates or division availability.</p>}{preview.unassigned.length>0 && <p>Assign verified, available referees in Admin Schedule before these games begin.</p>}{stale && <p role="alert">The workspace changed. Rebuild this preview.</p>}<button className="button-primary" disabled={stale || !!preview.issues.length || !preview.games.length} onClick={()=>{if(preview.base!==fingerprint)return;setGames(c=>[...c,...preview.games]);setTournaments(c=>({...c,[division]:preview.tournament}));setPreview(null);setNotice('Tournament round published to team schedules.')}}>Publish tournament round</button></section>}
  </section>
}
