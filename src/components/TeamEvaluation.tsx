import { teamEvaluation, type TeamEvaluationPlayer } from '../lib/team-evaluation'
import './TeamEvaluation.css'

export function TeamEvaluationSummary({ players, coach }: { players: TeamEvaluationPlayer[]; coach: string }) {
  const summary = teamEvaluation(players)
  return <section className="team-evaluation-summary" aria-label={`Team evaluation for ${coach}`}>
    <h3>Team evaluation</h3>
    <div className="team-evaluation-metrics"><div><span>Team average</span><strong>{summary.average === null ? '—' : summary.average.toFixed(2)}<small> / 10</small></strong></div><div><span>Evaluated points</span><strong>{summary.total.toFixed(2)}</strong></div><div><span>Evaluated players</span><strong>{summary.evaluated} / {summary.count}</strong></div></div>
    <p>{summary.count === 0 ? 'No players assigned yet.' : summary.evaluated < summary.count ? 'Provisional average: players with incomplete evaluations are excluded.' : 'Average = total player evaluation points divided by evaluated players.'}</p>
    <p>Player grades: {summary.grades.map(({ grade, count }) => `${grade}: ${count}`).join(' · ')}{players.filter((player) => player.grade === 'Incomplete').length > 0 ? ` · Incomplete: ${players.filter((player) => player.grade === 'Incomplete').length}` : ''}</p>
  </section>
}

export function TeamBalanceBoard({ teams, division, divisionPlayers }: { teams: { coach: string; players: TeamEvaluationPlayer[] }[]; division: string; divisionPlayers: TeamEvaluationPlayer[] }) {
  const summaries = teams.map((team) => ({ coach: team.coach, ...teamEvaluation(team.players) }))
  const baseline = teamEvaluation(divisionPlayers).average
  const comparable = summaries.filter((team) => team.count > 0 && team.evaluated === team.count && team.average !== null)
  const averages = comparable.map((team) => team.average!)
  const spread = averages.length >= 2 ? Math.max(...averages) - Math.min(...averages) : null
  const equalSize = new Set(summaries.map((team) => team.count)).size <= 1
  return <section className="team-balance-board panel" aria-label={`${division} team balance`}>
    <h3>Team balance · {division}</h3>
    <p>Division evaluation average: <strong>{baseline === null ? '—' : `${baseline.toFixed(2)} / 10`}</strong>. Team-average spread: <strong>{spread === null ? 'Waiting for two evaluated teams' : `${spread.toFixed(2)} points`}</strong>.</p>
    <p>{equalSize ? 'Compare team averages and the mix of player grades as picks are made.' : 'Roster sizes differ while picks are in progress. Compare averages alongside player counts; totals increase with roster size.'} No players are reassigned automatically.</p>
    <div className="team-balance-table-wrap"><table><thead><tr><th>Coach</th><th>Players</th><th>Evaluated</th><th>Total points</th><th>Average / 10</th><th>From division average</th><th>Player grades</th></tr></thead><tbody>{summaries.map((team) => <tr key={team.coach}><th scope="row">{team.coach}</th><td>{team.count}</td><td>{team.evaluated} / {team.count}</td><td>{team.total.toFixed(2)}</td><td>{team.average === null ? '—' : `${team.average.toFixed(2)}${team.evaluated < team.count ? ' (provisional)' : ''}`}</td><td>{team.average === null || baseline === null ? '—' : `${team.average - baseline >= 0 ? '+' : ''}${(team.average - baseline).toFixed(2)}`}</td><td>{team.grades.map(({ grade, count }) => `${grade}: ${count}`).join(' · ')}</td></tr>)}</tbody></table></div>
    <small>Spread is the highest minus lowest team average among nonempty teams with complete evaluations. Use the point gap for review; a balance limit has not been set.</small>
  </section>
}
