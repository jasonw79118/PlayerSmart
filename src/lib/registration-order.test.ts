import { describe, expect, it } from 'vitest'
import { registrationRoster } from './registration-order'

describe('alphabetical roster evaluation numbers', () => {
  it('makes Frankie Adams number one regardless of source order or old numbers', () => {
    const records = [
      { name: 'Zoe Young', grade: 'U10', number: '01', registrationOrder: 1 },
      { name: 'Frankie Adams', grade: 'U10', number: '24', registrationOrder: 24 },
      { name: 'Amy Brooks', grade: 'U10', number: '03', registrationOrder: 3 },
    ]
    const roster = registrationRoster(records)
    expect(roster.map(({ name, number }) => [name, number])).toEqual([
      ['Frankie Adams', '01'], ['Amy Brooks', '02'], ['Zoe Young', '03'],
    ])
    expect(records[0].number).toBe('01')
    expect(registrationRoster([...roster].reverse())).toEqual(roster)
  })
  it('numbers divisions independently and places imports alphabetically', () => {
    const records = [
      { name: 'Zoe Young', grade: 'U10', number: '' },
      { name: 'Sam Carter', grade: 'U12', number: '' },
      { name: 'Amy Brooks', grade: 'U10', number: '' },
    ]
    const roster = registrationRoster([...records, { name: 'Frankie Adams', grade: 'U10', number: '' }])
    expect(roster.filter(({ grade }) => grade === 'U10').map(({ number }) => number)).toEqual(['01', '02', '03'])
    expect(roster.find(({ grade }) => grade === 'U12')?.number).toBe('01')
  })
})
