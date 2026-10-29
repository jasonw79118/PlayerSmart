import { describe, expect, it } from 'vitest'
import { inferQuestionDivisions, validAskRefContext } from './askref-context'

describe('AskRef natural clarification context', () => {
  it('recognizes explicit division labels without guessing from a player age', () => {
    expect(inferQuestionDivisions('Is offside called in U-8?', [])).toEqual(['U8'])
    expect(inferQuestionDivisions('What about under eight?', [])).toEqual(['U8'])
    expect(inferQuestionDivisions('We are playing 10U.', [])).toEqual(['U10'])
    expect(inferQuestionDivisions('My eight-year-old fell down.', [])).toEqual([])
  })
  it('retains the original division through a factual follow-up and accepts an explicit correction', () => {
    const context = [{ question: 'Can a U8 throw go straight into a goal?', clarification: 'Which goal did it enter?' }]
    expect(inferQuestionDivisions('Our own goal.', context)).toEqual(['U8'])
    expect(inferQuestionDivisions('Actually this is U10.', context)).toEqual(['U10'])
  })
  it('understands a short division reply only when division was asked, including later turns', () => {
    const first = { question: 'Where is the free kick taken?', clarification: 'Which division is this game?' }
    expect(inferQuestionDivisions('8', [first])).toEqual(['U8'])
    expect(inferQuestionDivisions('8', [{ ...first, clarification: 'How far from the goal?' }])).toEqual([])
    expect(inferQuestionDivisions('Near the goal box.', [first, { question: '8', clarification: 'Where did the offence happen?' }])).toEqual(['U8'])
  })
  it('bounds and validates conversation data', () => {
    expect(validAskRefContext([{ question: 'Where is the kick?', clarification: 'Which division?' }])).toBe(true)
    expect(validAskRefContext([{ question: 'Hi', clarification: 8 }])).toBe(false)
    expect(validAskRefContext(Array(4).fill({ question: 'Hi', clarification: 'Where?' }))).toBe(false)
  })
})
