import { describe, expect, it } from 'vitest'
import { createDraftTestData } from './draft-test-data'
import { u10Rubric } from './evaluation'

describe('division draft test data', () => {
  it('adds a U6 test pool without changing IDs or players in the original divisions', () => {
    const original = ['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const
    const before = createDraftTestData(original)
    const after = createDraftTestData([...original, 'U6'])
    expect(after.players.filter((player) => player.grade !== 'U6')).toEqual(before.players)
    expect(after.players.filter((player) => player.grade === 'U6')).toHaveLength(30)
    expect(after.coachNames.U6).toHaveLength(5)
    expect(after.players.find((player) => player.id === 'draft-test-2-0')?.name).toBe('Alex Chen')
  })
  it('provides six unassigned thirty-player pools with five complete coach reviews each', () => {
    const divisions = ['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const
    const data = createDraftTestData(divisions)
    expect(data.players).toHaveLength(180)
    expect(new Set(data.players.map((player) => player.id)).size).toBe(180)
    expect(new Set(data.players.map((player) => player.name)).size).toBe(180)
    expect(new Set(data.coachDirectory).size).toBe(30)
    for (const division of divisions) {
      expect(data.coachNames[division]).toHaveLength(5)
      const players = data.players.filter((player) => player.grade === division)
      expect(players).toHaveLength(30)
      expect(new Set(players.map((player) => player.number)).size).toBe(30)
      for (const player of players) {
        expect(player.assignedCoach).toBeUndefined()
        expect(player.draftEligible).toBe(true)
        expect(player.status).toBe('Complete')
        expect(Object.keys(player.coachRatings)).toEqual(data.coachNames[division].slice(1))
        for (const review of [player.ratings, ...Object.values(player.coachRatings)]) {
          expect(Object.keys(review)).toEqual(u10Rubric.map(({ id }) => id))
          expect(Object.values(review).every((score) => score >= 1 && score <= 10)).toBe(true)
        }
      }
    }
  })
})
