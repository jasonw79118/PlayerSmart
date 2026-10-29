export type TeamEvaluationPlayer = { score: number | null; grade: string }

export function teamEvaluation(players: readonly TeamEvaluationPlayer[]) {
  const scored = players.filter((player) => player.grade !== 'Incomplete' && player.score !== null && Number.isFinite(player.score) && player.score >= 1 && player.score <= 10)
  const total = scored.reduce((sum, player) => sum + player.score!, 0)
  return {
    count: players.length, evaluated: scored.length, total,
    average: scored.length ? total / scored.length : null,
    grades: ['A+', 'A', 'B', 'C'].map((grade) => ({ grade, count: players.filter((player) => player.grade === grade).length })),
  }
}
