import { compareAthletes } from './athlete-order'

type RegisteredAthlete = { name: string; grade: string; number: string }

/** Evaluation numbers follow the complete alphabetical roster within each division. */
export function registrationRoster<T extends RegisteredAthlete>(records: readonly T[]): T[] {
  const lastPosition = new Map<string, number>()
  return [...records].sort(compareAthletes).map((athlete) => {
    const position = (lastPosition.get(athlete.grade) ?? 0) + 1
    lastPosition.set(athlete.grade, position)
    return { ...athlete, number: String(position).padStart(2, '0') }
  })
}
