import { describe, expect, it } from 'vitest'
import { compareAthletes } from './athlete-order'

describe('athlete last-name order', () => {
  it('orders surnames before given names and uses first names for ties', () => {
    const names = ['John Test', 'Liam Smith', 'Alex Murphy', 'Ava Smith', 'Jordan Blake']
    expect(names.map((name) => ({ name })).sort(compareAthletes).map((athlete) => athlete.name))
      .toEqual(['Jordan Blake', 'Alex Murphy', 'Ava Smith', 'Liam Smith', 'John Test'])
  })
  it('handles suffixes, comma-form names, accents and explicitly supplied surnames', () => {
    expect(compareAthletes({ name: 'Zoe Doe Jr.' }, { name: 'Aaron Evans' })).toBeLessThan(0)
    expect(compareAthletes({ name: 'Smith, Aaron' }, { name: 'Ava Smith' })).toBeLessThan(0)
    expect(compareAthletes({ name: 'Alex álvaréz' }, { name: 'Alex Brown' })).toBeLessThan(0)
    expect(compareAthletes({ name: 'Sam van Buren', firstName: 'Sam', lastName: 'van Buren' }, { name: 'Alex Young' })).toBeLessThan(0)
  })
})
