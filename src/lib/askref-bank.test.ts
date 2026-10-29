import { describe, expect, it } from 'vitest'
import { bankSources, isApprovedScenario, lookupBankAnswer, normalizeBankQuestion, questionDivisions, ruleScenarios, scenarioSnapshot, searchScenarios, type BankApproval } from './askref-bank'
import { pdsaRulesKnowledge } from './pdsa-rules'
import { verifiedRestartPlacements } from './verified-restart-placements'

function review(id: string): Record<string, BankApproval> {
  const entry = ruleScenarios.find((item) => item.id === id)!
  return { [id]: { reviewedBy: 'Test reviewer', reviewedOn: '2026-10-28', scenarioSnapshot: scenarioSnapshot(entry), sourceSnapshots: entry.sourceIds.map((sourceId) => {
    const source = pdsaRulesKnowledge.find((item) => item.id === sourceId)!
    return { id: source.id, text: source.text, edition: source.edition }
  }) } }
}

describe('AskRef scenario review and reuse', () => {
  it('keeps every seed draft out of automatic reuse until a real review is recorded', () => {
    expect(ruleScenarios.length).toBeGreaterThanOrEqual(60)
    expect(ruleScenarios.every((entry) => !isApprovedScenario(entry))).toBe(true)
    expect(lookupBankAnswer('How long is a quarter?', 'U8')).toBeUndefined()
  })
  it('requires the right division and exact known wording, including all relevant facts', () => {
    const reviews = review('u8-throw-redo')
    expect(lookupBankAnswer('Can we have a redo on that throw?', 'U8', reviews)?.id).toBe('u8-throw-redo')
    expect(lookupBankAnswer('Can we have a redo on that throw?', 'U10', reviews)).toBeUndefined()
    expect(lookupBankAnswer('Can we have a redo on that throw?', undefined, reviews)).toBeUndefined()
    expect(lookupBankAnswer('Can we have a redo on that throw? The coaches agreed otherwise.', 'U8', reviews)).toBeUndefined()
    expect(lookupBankAnswer('Can we NOT have a redo on that throw?', 'U8', reviews)).toBeUndefined()
  })
  it('invalidates a review when either the answer or cited source changes', () => {
    const entry = ruleScenarios.find((item) => item.id === 'u8-duration')!
    const reviews = review(entry.id)
    expect(isApprovedScenario(entry, reviews)).toBe(true)
    expect(isApprovedScenario({ ...entry, answer: 'Changed ruling' }, reviews)).toBe(false)
    reviews[entry.id].sourceSnapshots[0].text = 'Old rule text'
    expect(isApprovedScenario(entry, reviews)).toBe(false)
  })
  it('links every scenario and diagram to existing evidence and eligible divisions', () => {
    expect(new Set(ruleScenarios.map((item) => item.id)).size).toBe(ruleScenarios.length)
    for (const entry of ruleScenarios) {
      expect(entry.questions.length).toBeGreaterThanOrEqual(2)
      expect(entry.sourceIds.length).toBeGreaterThan(0)
      expect(entry.sourceIds.every((id) => bankSources.some((source) => source.id === id))).toBe(true)
      if (entry.placementId) {
        const placement = verifiedRestartPlacements.find((item) => item.id === entry.placementId)!
        expect(placement).toBeDefined()
        expect(entry.divisions.every((division) => placement.divisions.includes('All divisions') || placement.divisions.includes(division))).toBe(true)
        expect(placement.sourceIds.some((id) => entry.sourceIds.includes(id))).toBe(true)
      }
    }
  })
  it('filters practice questions without treating search similarity as an approved answer', () => {
    expect(searchScenarios('redo', 'U8', 'Coach').map((item) => item.id)).toEqual(expect.arrayContaining(['u8-throw-redo', 'throw-mulligan-explainer']))
    expect(normalizeBankQuestion('Can we have a redo on that throw, U-8?')).toBe('can we have a redo on that throw')
    expect(questionDivisions('U8 compared with under-10')).toEqual(['U8', 'U10'])
  })
})
