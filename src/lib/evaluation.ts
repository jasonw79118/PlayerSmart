export type RubricCategory = {
  id: string
  label: string
  group: string
  description: string
  weight: number
}

export const u10Rubric: RubricCategory[] = [
  { id: 'passing', label: 'Passing', group: 'Technical skills', description: 'Chooses an appropriate pass and delivers the ball to a teammate with useful pace and direction.', weight: 1 },
  { id: 'dribbling', label: 'Dribbling', group: 'Technical skills', description: 'Keeps the ball close while moving and uses changes of direction to retain possession.', weight: 1 },
  { id: 'first-touch', label: 'Ball control / first touch', group: 'Technical skills', description: 'Receives the ball into a useful space and keeps it under control.', weight: 1 },
  { id: 'shooting', label: 'Kicking / shooting', group: 'Technical skills', description: 'Strikes the ball with balance and directs it toward an intended target.', weight: 1 },
  { id: 'speed-movement', label: 'Speed and movement', group: 'Technical skills', description: 'Moves purposefully to support play, recover, or create space.', weight: 1 },
  { id: 'defending', label: 'Defensive ability', group: 'Technical skills', description: 'Tracks opponents, stays goal-side when appropriate, and challenges safely.', weight: 1 },
  { id: 'awareness', label: 'Field awareness', group: 'Game understanding', description: 'Notices teammates, opponents, space, and the ball during play.', weight: 1 },
  { id: 'decisions', label: 'Decision-making', group: 'Game understanding', description: 'Selects a reasonable next action based on the play in front of them.', weight: 1 },
  { id: 'positioning', label: 'Positioning', group: 'Game understanding', description: 'Finds useful spaces in attack and appropriate positions when defending.', weight: 1 },
  { id: 'listening', label: 'Listening', group: 'Development and behavior', description: 'Responds to activity instructions and safety cues during soccer activities.', weight: 1 },
  { id: 'attention', label: 'Attention', group: 'Development and behavior', description: 'Stays engaged with the current soccer activity and its next step.', weight: 1 },
  { id: 'alertness', label: 'Alertness', group: 'Development and behavior', description: 'Notices changes in play and reacts when the ball or situation changes.', weight: 1 },
  { id: 'confidence', label: 'Confidence', group: 'Development and behavior', description: 'Willingly tries soccer actions and re-engages after a mistake.', weight: 1 },
]

export const scoringAnchors = [
  { score: '1–2', label: 'Beginning to develop' },
  { score: '3–4', label: 'Developing with significant guidance' },
  { score: '5–6', label: 'Demonstrates the skill inconsistently' },
  { score: '7–8', label: 'Demonstrates the skill consistently' },
  { score: '9–10', label: 'Demonstrates advanced ability for the age division' },
] as const

export type Rating = { score: number; weight: number }
export type PlayerLetterGrade = 'Incomplete' | 'A+' | 'A' | 'B' | 'C'

/** Consolidates a complete set of coach scores into the draft-board letter grade. */
export function playerLetterGrade(overallScore: number | null, coachScores: readonly (number | null)[]): PlayerLetterGrade {
  if (overallScore === null || !Number.isFinite(overallScore) || coachScores.length === 0 || coachScores.some((score) => score === null || !Number.isFinite(score))) return 'Incomplete'
  const oneDecimal = Math.round(overallScore * 10) / 10
  if (coachScores.every((score) => score !== null && Math.round(score * 10) / 10 >= 9.7 && Math.round(score * 10) / 10 <= 10)) return 'A+'
  if (oneDecimal >= 9) return 'A'
  if (oneDecimal >= 8) return 'B'
  return 'C'
}

/** Returns null for incomplete ratings; never presents a partial score as a final average. */
export function calculateWeightedScore(ratings: readonly Rating[], expectedCount = ratings.length): number | null {
  if (ratings.length !== expectedCount || expectedCount === 0) return null
  if (ratings.some(({ score, weight }) => !Number.isFinite(score) || score < 1 || score > 10 || !Number.isFinite(weight) || weight <= 0)) return null
  const totalWeight = ratings.reduce((sum, rating) => sum + rating.weight, 0)
  return Math.round((ratings.reduce((sum, rating) => sum + rating.score * rating.weight, 0) / totalWeight) * 100) / 100
}
