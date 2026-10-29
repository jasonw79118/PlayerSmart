import { describe, expect, it } from 'vitest'
import { snakeDraftCoach } from './draft-order'

describe('snake draft order', () => {
  it('reverses each round with consecutive picks at both ends', () => {
    const order = [1, 2, 3, 4, 5]
    expect(Array.from({ length: 15 }, (_, pick) => snakeDraftCoach(order, pick)))
      .toEqual([1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5])
  })
  it('gives five coaches eight picks each across forty players', () => {
    const order = ['C', 'A', 'E', 'B', 'D']
    const picks = Array.from({ length: 40 }, (_, pick) => snakeDraftCoach(order, pick))
    for (const coach of order) expect(picks.filter((entry) => entry === coach)).toHaveLength(8)
    expect(picks.slice(5, 10)).toEqual([...order].reverse())
  })
  it('handles a single coach and an empty order', () => {
    expect(snakeDraftCoach([], 0)).toBeUndefined()
    expect(snakeDraftCoach(['A'], 7)).toBe('A')
  })
})
