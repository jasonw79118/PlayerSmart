import type { ScoreGame } from './score-game'

export type Standing = { coach: string; played: number; wins: number; losses: number; draws: number; points: number; goalsFor: number; goalsAgainst: number; seed: number; tied: boolean }
export type TournamentSetup = { lossLimit: number; byeSeeds: string; startDate: string; endDate: string; extraMatchMinutes: number }
export type Tournament = { id: string; division: string; seeds: string[]; lossLimit: number; openingByes: string[]; startDate?: string; endDate?: string; extraMatchMinutes?: number; rounds: { number: number; gameIds: string[]; byes: string[] }[] }
export function winner(game: ScoreGame): string | undefined {
  if (!game.finalized) return undefined
  if (game.homeScore !== game.awayScore) return game.homeScore > game.awayScore ? game.homeCoach : game.awayCoach
  if (game.phase === 'tournament' && Number.isInteger(game.homeShootout) && Number.isInteger(game.awayShootout) && game.homeShootout! >= 0 && game.awayShootout! >= 0 && game.homeShootout !== game.awayShootout) return game.homeShootout! > game.awayShootout! ? game.homeCoach : game.awayCoach
}
export function standings(division: string, coaches: string[], games: ScoreGame[]): Standing[] {
  const regular = games.filter(g => g.division === division && g.phase !== 'tournament' && g.finalized && g.scheduleStatus !== 'cancelled' && g.scheduleStatus !== 'postponed')
  const rows = [...new Set(coaches)].map(coach => {
    const matches = regular.filter(g => [g.homeCoach, g.awayCoach].includes(coach))
    const wins = matches.filter(g => winner(g) === coach).length
    const draws = matches.filter(g => g.homeScore === g.awayScore).length
    return { coach, played: matches.length, wins, draws, losses: matches.length - wins - draws, points: wins * 3 + draws,
      goalsFor: matches.reduce((n,g) => n + (g.homeCoach === coach ? g.homeScore : g.awayScore), 0), goalsAgainst: matches.reduce((n,g) => n + (g.homeCoach === coach ? g.awayScore : g.homeScore), 0), seed: 0, tied: false }
  })
  // Appendix C: points, goal difference, head-to-head for a two-team tie, goals scored.
  const compare = (a: Standing, b: Standing) => {
    const primary = b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    if (primary) return primary
    const group = rows.filter(r => r.points === a.points && r.goalsFor - r.goalsAgainst === a.goalsFor - a.goalsAgainst)
    if (group.length === 2) {
      const h2h = regular.filter(g => [g.homeCoach,g.awayCoach].includes(a.coach) && [g.homeCoach,g.awayCoach].includes(b.coach))
      const points = (coach: string) => h2h.reduce((n,g) => n + (winner(g) === coach ? 3 : g.homeScore === g.awayScore ? 1 : 0), 0)
      if (points(a.coach) !== points(b.coach)) return points(b.coach) - points(a.coach)
    }
    return b.goalsFor - a.goalsFor
  }
  rows.sort((a,b) => compare(a,b) || a.coach.localeCompare(b.coach))
  return rows.map((r,i) => ({ ...r, seed: i+1, tied: rows.some(other => other !== r && compare(r,other) === 0) }))
}
export function tournamentProgress(tournament: Tournament, games: ScoreGame[]) {
  const matches = games.filter(g => g.tournamentId === tournament.id)
  const losses = Object.fromEntries(tournament.seeds.map(coach => [coach, matches.filter(g => winner(g) && winner(g) !== coach && [g.homeCoach,g.awayCoach].includes(coach)).length]))
  const alive = tournament.seeds.filter(coach => losses[coach] < tournament.lossLimit)
  const last = tournament.rounds.at(-1)
  const pending = !!last && last.gameIds.some(id => !matches.some(g => g.id === id && winner(g)))
  return { losses, alive, pending, champion: !pending && alive.length === 1 ? alive[0] : undefined }
}
export function nextTournamentRound(tournament: Tournament, games: ScoreGame[]) {
  if (![1,2,3].includes(tournament.lossLimit)) throw new Error('Choose one, two or three losses before elimination.')
  const progress = tournamentProgress(tournament,games)
  if (progress.pending) throw new Error('Finalize every match in this round with a winner before advancing. Cancelled or postponed matches must be played or resolved first.')
  if (progress.alive.length < 2) throw new Error('The tournament is complete.')
  const number = tournament.rounds.length + 1
  const byes = number === 1 ? tournament.openingByes : [] as string[]
  if (new Set(byes).size !== byes.length || byes.some(c => !progress.alive.includes(c)) || progress.alive.length - byes.length < 2 || (progress.alive.length - byes.length) % 2 !== 0 && number === 1) throw new Error('Opening byes must leave an even number of at least two teams to play. Choose eligible seed numbers accordingly.')
  if (number > 1 && progress.alive.length % 2) {
    const count = (coach: string) => tournament.rounds.filter(r => r.byes.includes(coach)).length
    byes.push([...progress.alive].sort((a,b) => count(a)-count(b) || tournament.seeds.indexOf(a)-tournament.seeds.indexOf(b))[0])
  }
  const pool = progress.alive.filter(c => !byes.includes(c)).sort((a,b) => progress.losses[a]-progress.losses[b] || tournament.seeds.indexOf(a)-tournament.seeds.indexOf(b))
  const pairs: { homeCoach: string; awayCoach: string }[] = []
  while (pool.length > 1) {
    const homeCoach = pool.shift()!
    const previous = games.filter(g => g.tournamentId === tournament.id && [g.homeCoach,g.awayCoach].includes(homeCoach))
    let index = -1
    pool.forEach((coach,i) => { if (!previous.some(g => [g.homeCoach,g.awayCoach].includes(coach))) index = i })
    if (index < 0) index = pool.length - 1
    pairs.push({ homeCoach, awayCoach: pool.splice(index,1)[0] })
  }
  return { number, byes, pairs }
}
