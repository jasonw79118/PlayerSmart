import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { teamEvaluation } from '../lib/team-evaluation'
import { TeamBalanceBoard, TeamEvaluationSummary } from './TeamEvaluation'

describe('team evaluation and balance', () => {
  it('averages numeric player evaluations and excludes incomplete scores without counting them as zero', () => {
    const summary = teamEvaluation([{ score: 8.4, grade: 'B' }, { score: 6.2, grade: 'C' }, { score: 9.1, grade: 'A' }, { score: 8, grade: 'Incomplete' }])
    expect(summary.count).toBe(4)
    expect(summary.evaluated).toBe(3)
    expect(summary.total).toBeCloseTo(23.7)
    expect(summary.average).toBeCloseTo(7.9)
    expect(summary.grades.map((grade) => grade.count)).toEqual([0, 1, 1, 1])
    expect(teamEvaluation([]).average).toBeNull()
  })
  it('labels a partial team average provisional and an empty team unscored', () => {
    const { rerender } = render(<TeamEvaluationSummary coach="Avery" players={[{ score: 8, grade: 'B' }, { score: null, grade: 'Incomplete' }]} />)
    expect(screen.getByRole('region', { name: 'Team evaluation for Avery' })).toHaveTextContent('Provisional average')
    expect(screen.getByRole('region', { name: 'Team evaluation for Avery' })).toHaveTextContent('1 / 2')
    rerender(<TeamEvaluationSummary coach="Avery" players={[]} />)
    expect(screen.getByRole('region', { name: 'Team evaluation for Avery' })).toHaveTextContent('No players assigned yet.')
  })
  it('updates team averages, division differences and spread after a player is assigned', () => {
    const pool = [{ score: 8, grade: 'B' }, { score: 6, grade: 'C' }, { score: 10, grade: 'A+' }]
    const { rerender } = render(<TeamBalanceBoard division="U10" divisionPlayers={pool} teams={[{ coach: 'Avery', players: [pool[0]] }, { coach: 'Morgan', players: [pool[1]] }]} />)
    const board = screen.getByRole('region', { name: 'U10 team balance' })
    expect(board).toHaveTextContent('Team-average spread: 2.00 points')
    rerender(<TeamBalanceBoard division="U10" divisionPlayers={pool} teams={[{ coach: 'Avery', players: [pool[0], pool[2]] }, { coach: 'Morgan', players: [pool[1]] }]} />)
    expect(board).toHaveTextContent('Team-average spread: 3.00 points')
    expect(board).toHaveTextContent('Roster sizes differ')
    const row = within(board).getByRole('rowheader', { name: 'Avery' }).closest('tr')!
    expect(row.children[3]).toHaveTextContent('18.00')
    expect(row.children[4]).toHaveTextContent('9.00')
    expect(row.children[5]).toHaveTextContent('+1.00')
    expect(row.children[6]).toHaveTextContent('A+: 1')
  })
})
