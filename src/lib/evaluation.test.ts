import { describe, expect, it } from 'vitest'
import { calculateWeightedScore, playerLetterGrade, u10Rubric } from './evaluation'

describe('U10 evaluation rubric', () => {
  it('keeps listening and attention as distinct observable categories', () => {
    expect(u10Rubric.find(({ id }) => id === 'listening')?.label).toBe('Listening')
    expect(u10Rubric.find(({ id }) => id === 'attention')?.label).toBe('Attention')
  })

  it('calculates weighted scores', () => {
    expect(calculateWeightedScore([{ score: 8, weight: 3 }, { score: 4, weight: 1 }])).toBe(7)
  })

  it('marks incomplete or invalid ratings as unavailable', () => {
    expect(calculateWeightedScore([{ score: 8, weight: 1 }], 2)).toBeNull()
    expect(calculateWeightedScore([{ score: 11, weight: 1 }])).toBeNull()
  })

  it('applies the requested draft letter-grade bands and the unanimous A+ threshold', () => {
    expect(playerLetterGrade(10, [10, 9.7])).toBe('A+')
    expect(playerLetterGrade(9.7, [9.7, 9.64])).toBe('A')
    expect(playerLetterGrade(9, [9, 9])).toBe('A')
    expect(playerLetterGrade(8.94, [8.94, 8.94])).toBe('B')
    expect(playerLetterGrade(8, [8, 8])).toBe('B')
    expect(playerLetterGrade(7.94, [7.94, 7.94])).toBe('C')
    expect(playerLetterGrade(0, [0, 0])).toBe('C')
    expect(playerLetterGrade(10, [10, null])).toBe('Incomplete')
  })
})
