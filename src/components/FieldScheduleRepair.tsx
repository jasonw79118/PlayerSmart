import { useState, type Dispatch, type SetStateAction } from 'react'
import type { ScheduleBreak } from '../lib/schedule-breaks'
import type { ClubField } from '../lib/fields'
import { clubNotBefore, clubToday, defaultScheduleSettings, displayTime, fieldAvailable, hasRecordedPlay, matchTiming, planMatches, scheduleDateBlocked, type ScheduleSettings } from '../lib/match-scheduler'
import { assignAvailableReferees, type RefereeProfile } from '../lib/referees'
import type { TournamentSetup } from '../lib/tournament'
import type { ScoreGame } from '../lib/score-game'

export function FieldScheduleRepair({fields,games,setGames,settings,referees,seasonStart,seasonEnd,fallRenewalDay,tournamentSetups={},scheduleBreaks=[]}: {fields:ClubField[];games:ScoreGame[];setGames:Dispatch<SetStateAction<ScoreGame[]>>;settings:Record<string,ScheduleSettings>;referees:RefereeProfile[];seasonStart:string;seasonEnd:string;fallRenewalDay:string;tournamentSetups?:Record<string,TournamentSetup>;scheduleBreaks?:ScheduleBreak[]}) {
  const [rework,setRework]=useState(false)
  const [preview,setPreview]=useState<{base:string;changes:ScoreGame[];missing:string[]}|null>(null)
  const base=JSON.stringify({fields,games,settings,referees,fallRenewalDay,tournamentSetups,scheduleBreaks})
  const affected=games.filter(g=>g.division && g.date>=clubToday() && g.scheduleStatus!=='cancelled' && !g.finalized && (scheduleDateBlocked({...defaultScheduleSettings(g.division,seasonStart,seasonEnd),...settings[g.division],scheduleBreaks},g.date,g.division) || g.scheduleStatus!=='postponed' && !fieldAvailable({date:g.date,kickoff:g.kickoff ?? g.time,field:g.field ?? '',durationMinutes:g.durationMinutes ?? matchTiming(g.division).total,turnaroundMinutes:g.turnaroundMinutes ?? 0},g.division,fields)))
  function build() {
    const movable=(rework ? games.filter(g=>g.division && g.date>=clubToday() && g.scheduleStatus!=='cancelled' && (g.scheduleStatus!=='postponed' || affected.some(a=>a.id===g.id))) : affected).filter(g=>!hasRecordedPlay(g))
    const ids=new Set(movable.map(g=>g.id));let resources=games.filter(g=>!ids.has(g.id));const changes:ScoreGame[]=[];const missing:string[]=[]
    for(const game of movable.sort((a,b)=>a.date.localeCompare(b.date) || (a.kickoff ?? a.time).localeCompare(b.kickoff ?? b.time))) {
      const config={...(settings[game.division!] ?? defaultScheduleSettings(game.division!,seasonStart,seasonEnd)),...(game.phase === 'tournament' && tournamentSetups[game.division!] ? {startDate:tournamentSetups[game.division!].startDate,endDate:tournamentSetups[game.division!].endDate} : {}),fieldAvailability:fields,fallRenewalDay,scheduleBreaks,extraMatchMinutes:game.phase==='tournament'?Math.max(20,(game.durationMinutes ?? 0)-matchTiming(game.division!).total):0}
      const pair={id:game.id,division:game.division!,homeCoach:game.homeCoach,awayCoach:game.awayCoach,homeAssistantCoach:game.homeAssistantCoach,awayAssistantCoach:game.awayAssistantCoach}
      const previous=game.phase==='tournament'?games.filter(g=>g.tournamentId===game.tournamentId && (g.tournamentRound ?? 0)<(game.tournamentRound ?? 0) || game.tournamentRound === 1 && g.division === game.division && g.phase !== 'tournament' && g.scheduleStatus !== 'cancelled').map(g=>changes.find(c=>c.id===g.id)?.date ?? g.date).sort().at(-1):undefined
      const after=previous?new Date(Date.parse(previous+'T12:00:00Z')+86400000).toISOString().slice(0,10)+'T00:00':clubNotBefore()
      const plan=planMatches([pair],resources,config,[clubNotBefore(),after].sort().at(-1)!)
      if(!plan.placed.length) {missing.push(game.homeCoach+' vs '+game.awayCoach);continue}
      const slot=plan.placed[0].slot
      const replacement={...game,...slot,scheduleStatus:'scheduled' as const,time:displayTime(slot.kickoff),referee:'',refereeId:undefined,scheduleReason:'Rescheduled after no-game dates or field availability changed',scheduleHistory:[...(game.scheduleHistory ?? []),{date:game.date,time:game.time,field:game.field,status:game.scheduleStatus ?? 'scheduled' as const,reason:'No-game dates or field availability changed',changedAt:new Date().toISOString()}]}
      const assigned=assignAvailableReferees([replacement],resources,referees,config).games[0]
      changes.push(assigned);resources=[...resources,assigned]
    }
    setPreview({base,changes,missing})
  }
  return <section className="panel match-scheduler" aria-label="Repair field schedules"><h2>Reschedule affected games</h2><p>{affected.length ? `${affected.length} upcoming matches fall on unavailable dates or fields. Preview replacement times across divisions.` : 'No upcoming matches need repair. Saved field availability and no-game periods are checked automatically.'}</p>{affected.filter(hasRecordedPlay).map(g=><p key={g.id} role="alert">{g.homeTeam} vs {g.awayTeam}: play is already recorded; Admin must review this match.</p>)}<div hidden={!affected.some(g=>!hasRecordedPlay(g))}><label><input type="checkbox" checked={rework} onChange={e=>{setRework(e.target.checked);setPreview(null)}} />Rework other upcoming unplayed matches too, to free capacity</label><button className="button-secondary" disabled={!affected.some(g=>!hasRecordedPlay(g))} onClick={build}>Preview schedule repair</button></div>{preview && <div><h3>Proposed replacement times</h3>{preview.changes.map(g=><p key={g.id}>{g.division}: {g.homeCoach} vs {g.awayCoach} / {g.date} {g.time} / Field {g.field} / {g.referee || 'Referee needed'}</p>)}{preview.missing.length>0 && <p role="alert">No available slot: {preview.missing.join('; ')}. Extend division dates/hours, open another eligible field, or allow a backup day. No changes have been applied.</p>}{preview.base!==base && <p role="alert">Availability or matches changed. Rebuild the preview.</p>}<button className="button-primary" disabled={preview.base!==base || !!preview.missing.length || !preview.changes.length} onClick={()=>{if(preview.base!==base)return;const replacements=new Map(preview.changes.map(g=>[g.id,g]));setGames(c=>c.map(g=>replacements.get(g.id) ?? g));setPreview(null)}}>Apply schedule repair</button></div>}</section>
}
