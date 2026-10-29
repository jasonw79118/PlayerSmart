import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CoachDraftBoard, rankedCoachBoard } from './CoachDraftBoard'

const players = [
  { id: 'a', name: 'Alex Carter', number: 1, score: '9.0' },
  { id: 'b', name: 'Jamie Flores', number: 2, score: '8.0' },
  { id: 'c', name: 'Jordan Lee', number: 3, score: '7.0' },
]
describe('coach preference board', () => {
  it('ranks preferred available players first, then remaining evaluation suggestions', () => {
    expect(rankedCoachBoard(players, ['c', 'b']).map((player) => player.id)).toEqual(['c', 'b', 'a'])
    expect(rankedCoachBoard(players.slice(0, 2), ['c', 'b']).map((player) => player.id)).toEqual(['b', 'a'])
  })
  it('supports adding, reordering, removing preferences and updates after a selection is drafted', () => {
    const update = vi.fn()
    const select = vi.fn()
    const props = { coach: 'Avery', available: players, preferences: ['c', 'b'], onPreferencesChange: update, onSelect: select }
    const { rerender } = render(<CoachDraftBoard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Move Jamie Flores earlier for Avery' }))
    expect(update).toHaveBeenLastCalledWith(['b', 'c'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove preference Jordan Lee for Avery' }))
    expect(update).toHaveBeenLastCalledWith(['b'])
    fireEvent.click(screen.getByRole('button', { name: 'Prioritize Alex Carter for Avery' }))
    expect(update).toHaveBeenLastCalledWith(['c', 'b', 'a'])
    rerender(<CoachDraftBoard {...props} available={players.slice(0, 2)} />)
    const rows = within(screen.getByRole('list', { name: 'Ranked available players for Avery' })).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Jamie Flores')
    expect(rows[0]).toHaveTextContent('Preference 1')
    expect(rows[1]).toHaveTextContent('Alex Carter')
    expect(screen.queryByRole('button', { name: 'Select Jordan Lee for Avery' })).toBeNull()
  })
})
