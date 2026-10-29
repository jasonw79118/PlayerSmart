import { describe, expect, it } from 'vitest'
import entries from './askref-expanded-training.json'
import pendingRules from './askref-pending-rules.json'
import { expandedTrainingAnswer, expandedTrainingScenarios, pendingCountdownAnswer } from './askref-expanded-training'
import { bankSources, refereeDivisions, ruleScenarios } from './askref-bank'
import { rulebookFactAnswer } from './askref-rule-facts'
const ask = (number: number, division = 'U10') => expandedTrainingAnswer(`${entries.find((entry) => entry.number === number)!.question} ${division}`)!

describe('Expanded guide questions 76–175', () => {
  it('covers every question and alias in each supported division with citations and application details', () => {
    expect(entries).toHaveLength(100)
    expect(entries.map((entry) => entry.number)).toEqual(Array.from({ length: 100 }, (_, index) => index + 76))
    for (const entry of entries) {
      for (const division of refereeDivisions) {
        const answer = ask(entry.number, division)
        expect(answer, `${entry.number} ${division}`).not.toBeNull()
        expect(answer.division).toBe(division)
        expect(answer.citations.length).toBeGreaterThan(0)
        expect(answer.ruleApplication?.restartType).toBeTruthy()
        expect(answer.ruleApplication?.location).toBeTruthy()
        expect(answer.ruleApplication?.discipline).toBeTruthy()
      }
      for (const question of [entry.question, ...entry.aliases]) expect(rulebookFactAnswer(question), question).not.toBeNull()
    }
  })
  it('keeps the hidden draft bank synchronized and cites existing evidence', () => {
    for (const entry of expandedTrainingScenarios) {
      expect(ruleScenarios.find((scenario) => scenario.id === entry.id)).toEqual(JSON.parse(JSON.stringify(entry)))
      expect(entry.sourceIds.every((id) => bankSources.some((source) => source.id === id))).toBe(true)
    }
  })
  it('clarifies division and handles a short reply to a foot-placement alias', () => {
    const question = 'He lifted his back leg'
    const first = rulebookFactAnswer(question)!
    expect(first.clarification).toContain('Which division')
    const next = rulebookFactAnswer('8', [{ question, clarification: first.clarification! }])!
    expect(next.division).toBe('U8')
    expect(next.explanation).toContain('At release')
    expect(next.explanation).toContain('teaching retake')
    expect(next.ruleApplication?.discipline).toContain('No cards')
    expect(ask(76, 'U10').explanation).toContain('does not receive throw-in mulligans')
    expect(ask(76, 'U6').explanation).toContain('kick-ins, not throw-ins')
  })
  it('distinguishes legal grounding, never-entered throws, and ordinary illegal throws', () => {
    expect(ask(77).explanation).toContain('toes stay grounded')
    expect(ask(87).explanation).toContain('heel touches the line')
    expect(ask(96).explanation).toContain('retaken by the same team')
    expect(ask(96).explanation).toContain('incorrectly performed throw that enters play')
    expect(ask(105).explanation).toContain('flip are not automatically illegal')
  })
  it('keeps goal-kick placement and retreat division-specific', () => {
    expect(ask(107, 'U8').ballPlacement).toContain('on the goal line')
    expect(ask(107, 'U8').explanation).not.toContain('within the goal area')
    expect(ask(107, 'U10').ballPlacement).toContain('within the goal area')
    expect(ask(109, 'U8').explanation).toContain('own half')
    expect(ask(113, 'U8').explanation).toContain('has no goalkeeper')
  })
  it('uses PDSA wall distances without applying them to corners', () => {
    expect(ask(120, 'U8').explanation).toContain('4 yards')
    expect(ask(120, 'U10').explanation).toContain('8 yards')
    expect(ask(116, 'U8').explanation).toContain('10 yards from the corner arc')
  })
  it('overrides general card and penalty answers in no-card divisions', () => {
    expect(ask(137, 'U8').ruleApplication?.discipline).toContain('No cards')
    expect(ask(140, 'U8').explanation).toContain('does not award cards')
    expect(ask(168, 'U8').explanation).toContain('indirect free kick')
    expect(ask(168, 'U8').explanation).toContain('does not use')
    expect(ask(137, 'U10').ruleApplication?.discipline).toContain('Sending-off')
  })
  it('uses local equipment and entry exceptions instead of the pasted guide’s blanket claims', () => {
    expect(ask(145).explanation).toContain('permits small stud earrings covered with tape')
    expect(ask(145).sayToThem).not.toContain('must be removed')
    expect(ask(150).explanation).toContain('protective padding')
    expect(ask(141, 'U6').explanation).toContain('anytime')
    expect(ask(141, 'U10').explanation).toContain('own corner/throw-in')
    expect(ask(160, 'U6').explanation).toContain('one U6 coach')
  })
  it('stores the newer countdown separately without activating it as a PDSA rule', () => {
    expect(pendingRules[0].active).toBe(false)
    expect(bankSources.some((source) => source.version === '2026/27')).toBe(false)
    const answer = pendingCountdownAnswer('Do we use a five-second throw-in countdown?')!
    expect(answer.sourceStatus).toBe('pending-pdsa-adoption')
    expect(answer.explanation).toContain('adoption of this newer countdown has not been established')
    expect(answer.recommendCoordinator).toBe(true)
  })
  it('does not apply a nearby canned answer to negation or added incident facts', () => {
    expect(expandedTrainingAnswer('He lifted his back leg after release and the defender punched him. U10')).toBeNull()
    expect(expandedTrainingAnswer('Can a player throw with one hand? U8 and U10')).toBeNull()
  })
})
