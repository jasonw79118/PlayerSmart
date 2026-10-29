import { describe, expect, it } from 'vitest'
import questions from './askref-training-questions.json'
import { trainingGuideAnswer, trainingGuideScenarios } from './askref-training'
import { bankSources, ruleScenarios } from './askref-bank'
import { rulebookFactAnswer } from './askref-rule-facts'

const ask = (number: number, division?: string) => trainingGuideAnswer(`${questions.find((item) => item.number === number)!.question}${division ? ` ${division}` : ''}`)!
describe('Supplied young referee training guide', () => {
  it('covers all 75 questions with a supported answer or division clarification', () => {
    expect(questions).toHaveLength(75)
    expect(new Set(questions.map((item) => item.number)).size).toBe(75)
    for (const question of questions) {
      const first = rulebookFactAnswer(question.question)!
      expect(first, question.question).not.toBeNull()
      if (first.clarification) {
        const reply = rulebookFactAnswer('U10', [{ question: question.question, clarification: first.clarification }])!
        expect(reply, question.question).not.toBeNull()
        expect(reply.division).toBe('U10')
        expect(reply.clarification).toBeUndefined()
        expect(reply.citations.length).toBeGreaterThan(0)
      } else expect(first.citations.length).toBeGreaterThan(0)
      expect(trainingGuideAnswer(`Please explain: ${question.question}`)).not.toBeNull()
    }
  })
  it('keeps generated hidden drafts and their supporting evidence in sync', () => {
    expect(trainingGuideScenarios).toHaveLength(75)
    for (const scenario of trainingGuideScenarios) {
      expect(ruleScenarios.find((item) => item.id === scenario.id)).toEqual(JSON.parse(JSON.stringify(scenario)))
      expect(scenario.sourceIds.every((id) => bankSources.some((source) => source.id === id))).toBe(true)
    }
  })
  it('keeps PDSA small-sided exceptions ahead of the general training guide', () => {
    expect(ask(1, 'U8').explanation).toContain('indirect')
    expect(ask(39, 'U8').explanation).toContain('does not award cards')
    expect(ask(24, 'U8').explanation).toContain('does not call offside')
    expect(ask(13, 'U6').explanation).toContain('kick-ins instead of throw-ins')
    expect(ask(73, 'U10').explanation).toContain('no throw-in mulligans')
    expect(ask(56, 'U8').explanation).toContain('indirect free kicks')
  })
  it('does not adopt the guide’s unverified lightning thresholds or newer IFAB edition', () => {
    for (const number of [58, 59]) {
      const answer = ask(number)
      expect(answer.explanation).toContain('not established by this bundled rule text')
      expect(answer.recommendCoordinator).toBe(true)
      expect(answer.sayToThem).not.toMatch(/10.mile|30.minute/)
      expect(answer.sourceVersions?.IFAB).toBe('2025/26')
    }
  })
  it('never turns the example time or a hypothetical observation into a match fact', () => {
    expect(ask(34).sayToThem).not.toContain('three minutes')
    expect(ask(34).explanation).toContain('no access to this game’s clock')
    expect(ask(44).sayToThem).not.toContain('clear view')
    expect(ask(1, 'U10').sayToThem).toContain('you actually saw')
  })
  it('handles the own-half and defender-deflection offside qualifications', () => {
    const answer = ask(27, 'U10')
    expect(answer.explanation).toContain('returning there')
    expect(ask(28, 'U10').explanation).toContain('deflection or deliberate save does not')
  })
  it.each([71, 72])('leaves missing local procedures for coordinator confirmation: %s', (number) => {
    expect(ask(number, 'U10').recommendCoordinator).toBe(true)
    expect(ask(number, 'U10').explanation).toContain('does not establish')
  })
  it('uses the original PDF’s goalkeeper table and injury-clock rule', () => {
    expect(ask(66, 'U8').explanation).toContain('no goalkeeper')
    expect(ask(66, 'U10').explanation).toContain('uses a goalkeeper')
    expect(ask(35).explanation).toContain('clock must not be stopped for injury')
  })
  it('keeps water-break answers specific to the requested division', () => {
    const answer = ask(61, 'U8')
    expect(answer.explanation).not.toMatch(/U10|U12|U14|U18/)
    expect(answer.recommendCoordinator).toBe(true)
  })
  it('does not reuse a nearby answer for added incident facts or conflicting divisions', () => {
    expect(trainingGuideAnswer('But I got the ball first! The other player was bleeding.')).toBeNull()
    expect(trainingGuideAnswer('How was I offside? U8 and U10')).toBeNull()
    expect(trainingGuideAnswer('Can we change goalkeepers? U9')).toBeNull()
  })
})
