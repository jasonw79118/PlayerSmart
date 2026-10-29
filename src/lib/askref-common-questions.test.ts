import { describe, expect, it } from 'vitest'
import { commonRuleAnswer, commonQuestionScenarios } from './askref-common-questions'
import { bankSources, refereeDivisions, ruleScenarios } from './askref-bank'

describe('Common volunteer referee questions', () => {
  it('keeps the internal review-bank drafts in sync with the live lookup catalog', () => {
    for (const scenario of commonQuestionScenarios) {
      expect(ruleScenarios.find((entry) => entry.id === scenario.id)).toEqual(JSON.parse(JSON.stringify(scenario)))
    }
  })
  it('answers every listed question, requesting a division when needed', () => {
    for (const scenario of commonQuestionScenarios) {
      for (const question of scenario.questions) {
        const answer = commonRuleAnswer(question)!
        expect(answer, question).not.toBeNull()
        expect(answer.clarification || answer.citations.length, question).toBeTruthy()
      }
    }
  })
  it('places throw-ins and shows the matching diagram', () => {
    const answer = commonRuleAnswer('Where do throw-ins get placed?')!
    expect(answer.explanation).toContain('spot where the ball crossed the touchline')
    expect(answer.explanation).toContain('U6 uses kick-ins')
    expect(answer.diagramId).toBe('throw-in')
    expect(commonRuleAnswer('Where do I take a throw in in U6?')?.explanation).toContain('on or outside the touchline')
    expect(commonRuleAnswer('Where do I take a throw in? U6')?.explanation).toContain('unlimited all season')
  })
  it('understands mulligan misspellings and keeps the local exceptions', () => {
    const answer = commonRuleAnswer('What divisions get mullegans for throw-ins?')!
    expect(answer.explanation).toContain('U8')
    expect(answer.explanation).toContain('agree otherwise')
    expect(answer.explanation).toContain('U6 uses kick-ins')
    expect(answer.explanation).toContain('no throw-in mulligans')
    expect(commonRuleAnswer('Do we get a second try on throw-ins? U10')?.explanation).toContain('U10 has no')
  })
  it('explains offside to U10 players without the last-defender or position-alone shortcut', () => {
    const answer = commonRuleAnswer('How do I explain off-sides to U10 players?')!
    expect(answer.division).toBe('U10')
    expect(answer.explanation).toContain('second-last opponent')
    expect(answer.explanation).toContain('Position alone is not a foul')
    expect(answer.explanation).toContain('No offside directly from a throw-in')
    expect(answer.citations.some((source) => source.id === 'IFAB-2025-26-LAW-11')).toBe(true)
    expect(commonRuleAnswer('What is offside? U8')?.explanation).toContain('does not call offside')
    expect(commonRuleAnswer('What is offside in U8?')?.explanation).toContain('does not call offside')
  })
  it('asks once for a division and understands a short reply or later division change', () => {
    const question = 'When do direct kicks get awarded?'
    const clarification = commonRuleAnswer(question)!.clarification!
    expect(clarification).toContain('Which division')
    const context = [{ question, clarification }]
    expect(commonRuleAnswer('8', context)?.explanation).toContain('all fouls indirect')
    expect(commonRuleAnswer('U10', context)?.explanation).toContain('penalty kick')
    expect(commonRuleAnswer('What is offside?', [{ question: 'How long is a U10 game?', clarification: '' }])?.division).toBe('U10')
  })
  it.each(refereeDivisions)('keeps card and free-kick rules specific to %s', (division) => {
    const card = commonRuleAnswer(`Explain yellow and red cards ${division}`)!
    const indirect = commonRuleAnswer(`When do in-direct kicks get awarded? ${division}`)!
    expect(card.division).toBe(division)
    expect(indirect.division).toBe(division)
    if (['U6', 'U8'].includes(division)) {
      expect(card.explanation).toContain('does not award cards')
      expect(indirect.explanation).toContain('all fouls are indirect')
    } else {
      expect(card.explanation).toContain('A red card can be given without a previous yellow')
      expect(indirect.explanation).toContain('eight seconds is a corner-kick offence')
    }
  })
  it('uses the PDSA restriction before IFAB goalkeeper exceptions', () => {
    const answer = commonRuleAnswer('When is a goalie restricted from picking up the ball? U10')!
    expect(answer.explanation).toMatch(/outside their own penalty area/i)
    expect(answer.explanation).toContain('deliberate teammate pass-back')
    expect(answer.explanation).not.toContain('attempted to kick')
    expect(answer.explanation).toContain('until another player touches it')
    expect(answer.explanation).toContain('eight seconds gives a corner kick')
    expect(answer.explanation).not.toContain('six seconds')
  })
  it('describes field areas without assuming adult measurements for youth fields', () => {
    const answer = commonRuleAnswer('Describe the different areas of the field?')!
    expect(answer.explanation).toContain('penalty arc')
    expect(answer.explanation).toContain('Youth fields can use different sizes')
    expect(answer.explanation).not.toMatch(/18.yard|six.yard/)
  })
  it('uses the original PDSA injury-clock instruction and separates safety stoppages', () => {
    const answer = commonRuleAnswer('What causes the clock to stop in game?')!
    expect(answer.explanation).toContain('no added time for ordinary stoppages')
    expect(answer.explanation).toContain('clock must not be stopped for injury')
    expect(answer.explanation).toContain('Stop play when safety requires it')
    expect(answer.recommendCoordinator).toBe(true)
  })
  it.each(['Was that U10 tackle a red card?', 'What is offside? U8 and U10', 'When do direct kicks get awarded? U9', 'Can the keeper pick it up after that deflection?'])('leaves a specific or unsupported case for clarification or inference: %s', (question) => {
    expect(commonRuleAnswer(question)).toBeNull()
  })
  it('rejects a source changed during the session', () => {
    const source = bankSources.find((entry) => entry.id === 'IFAB-2025-26-LAW-11')!
    const original = source.text
    try {
      source.text = 'A changed source requires a new explanation.'
      expect(commonRuleAnswer('What is offside? U10')).toBeNull()
    } finally { source.text = original }
  })
})
