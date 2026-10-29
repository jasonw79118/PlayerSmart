import { describe, expect, it } from 'vitest'
import { rulebookFactAnswer } from './askref-rule-facts'
import { pdsaRulesKnowledge } from './pdsa-rules'

describe('Goal-kick rulebook answers', () => {
  it.each(['Where do goal kicks get place in u8?', 'Where do I take a goal kick in U8?', 'Where is the U8 goal-kick placed?'])('answers the U8 placement question: %s', (question) => {
    const answer = rulebookFactAnswer(question)!
    expect(answer.division).toBe('U8')
    expect(answer.explanation).toContain('on the goal line, outside the goal box')
    expect(answer.explanation).toContain('own half')
    expect(answer.explanation).not.toMatch(/U6|U10|U12|U14|U18/)
    expect(answer.ballPlacement).not.toContain('U6')
    expect(answer.diagramId).toBe('goal-kick-u6-u8')
    expect(answer.citations[0].id).toBe('pdsa-law-16-goal-kick')
  })
  it('explains the restart without requiring a division', () => {
    const answer = rulebookFactAnswer('what is a goal kick?')!
    expect(answer.explanation).toContain('defending team')
    expect(answer.explanation).toContain('last touching an attacking player')
    expect(answer.clarification).toBeUndefined()
    expect(answer.division).toBe('All divisions')
    expect(answer.ballPlacement).toBeNull()
  })
  it('asks for missing division for placement and understands a short reply', () => {
    const question = 'Where do I take a goal kick?'
    const first = rulebookFactAnswer(question)!
    expect(first.clarification).toContain('Which division')
    const context = [{ question, clarification: first.clarification! }]
    expect(rulebookFactAnswer('8', context)?.division).toBe('U8')
    expect(rulebookFactAnswer('U6', context)?.division).toBe('U6')
  })
  it.each(['Where is the U10 goal kick placed?', 'Where is a U8 goal kick after a foul?', 'Where is the U8 free kick or goal kick?'])('does not substitute the small-sided placement for %s', (question) => {
    expect(rulebookFactAnswer(question)).toBeNull()
  })
  it('stops using placement when its evidence changes', () => {
    const source = pdsaRulesKnowledge.find((entry) => entry.id === 'pdsa-law-16-goal-kick')!
    const original = source.text
    try {
      source.text = original.replace('anywhere on the goal line', 'inside the goal area')
      expect(rulebookFactAnswer('Where do goal kicks get place in u8?')).toBeNull()
    } finally { source.text = original }
  })
})

describe('Division-specific rulebook timing answers', () => {
  it.each(['How long is a U10 game?', 'what is the game lenght on a U10 games', 'How many minutes are U10 games supposed to be?', "What's the game length for under ten?"] )('answers only U10 for %s', (question) => {
    const answer = rulebookFactAnswer(question)!
    expect(answer?.division).toBe('U10')
    expect(answer.explanation).toContain('two 25-minute halves: 50 minutes')
    expect(answer.explanation).toContain('5-minute halftime')
    expect(answer.explanation).not.toMatch(/U6|U8|U12|U14|U18/)
    expect(answer.citations[0].excerpt).not.toMatch(/U6|U8|U12|U14|U18/)
    expect(answer.answerOrigin).toBe('rulebook')
  })
  it('asks for division once and understands a short reply', () => {
    const first = rulebookFactAnswer('How long is a game?')!
    expect(first.clarification).toContain('Which division')
    const answer = rulebookFactAnswer('10', [{ question: 'How long is a game?', clarification: first.clarification! }])!
    expect(answer.division).toBe('U10')
    expect(answer.explanation).toContain('25-minute halves')
  })
  it('handles a division change within the timing topic but does not revive an older unrelated topic', () => {
    expect(rulebookFactAnswer('What about U8?', [{ question: 'How long is a U10 game?', clarification: '' }])?.explanation).toContain('four 10-minute quarters')
    expect(rulebookFactAnswer('What about U8?', [{ question: 'How long is a U10 game?', clarification: '' }, { question: 'Is offside called in U10?', clarification: '' }])).toBeNull()
  })
  it.each(['How long can the goalkeeper hold the ball in a U10 game?', 'How long is U10 overtime?', 'How long is a U10 game delayed by lightning?', 'How long is a U10 water break?', 'Does the U10 mercy rule end the game early?'])('does not substitute ordinary match duration for %s', (question) => {
    expect(rulebookFactAnswer(question)).toBeNull()
  })
  it('does not use stored timing facts if supporting source text changes', () => {
    const source = pdsaRulesKnowledge.find((entry) => entry.id === 'pdsa-law-7-duration')!
    const original = source.text
    try {
      source.text = original.replace('U10 games have two 25-minute halves', 'U10 games have two 20-minute halves')
      expect(rulebookFactAnswer('How long is a U10 game?')).toBeNull()
    } finally { source.text = original }
  })
})
