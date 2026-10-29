import { describe, expect, it } from 'vitest'
import { enforcePdsaAuthority, pdsaAuthorityConflict, requiredPdsaSources } from './askref-authority'
import { isApprovedScenario, ruleScenarios, scenarioSnapshot, bankSources, type BankApproval } from './askref-bank'
import { rulebookFactAnswer } from './askref-rule-facts'
import type { AskRefResponse } from './askref-chat'

const answer = (explanation: string, division = 'U8'): AskRefResponse => ({ explanation, division, citations: [], ballPlacement: null, diagramId: null, recommendCoordinator: false, answerOrigin: 'qwen' })
describe('PDSA authority over IFAB and saved answers', () => {
  it.each([
    ['Award a penalty kick.', 'U8', /indirect free kick/],
    ['Show a yellow card.', 'U8', /no cards/],
    ['Offside applies in this game.', 'U8', /does not call offside/],
    ['The goalkeeper can handle the ball.', 'U8', /no goalkeeper/],
    ['U10 gets a throw-in mulligan.', 'U10', /does not allow throw-in mulligans/],
    ['Stop the clock for a serious injury.', 'U10', /clock must not be stopped/],
    ['For a teammate throw-in there is an exception if the keeper attempted to kick it.', 'U10', /Do not use an IFAB exception/],
  ])('replaces a known conflicting answer with the controlling local rule: %s', (text, division, expected) => {
    const result = enforcePdsaAuthority(answer(text, division))
    expect(result.explanation).toMatch(expected)
    expect(result.citations[0].authority).toBe('PDSA')
    expect(result.recommendCoordinator).toBe(true)
  })
  it('leaves a compatible IFAB detail alone when PDSA is silent', () => {
    const candidate = answer('Part of the ball may overhang the corner arc.', 'U10')
    expect(enforcePdsaAuthority(candidate)).toBe(candidate)
    expect(pdsaAuthorityConflict(answer('Do not show a yellow card in U8.'), 'U8')).toBeNull()
  })
  it('requires local evidence for modified topics before generating an answer', () => {
    expect(requiredPdsaSources('Can the U10 goalkeeper handle a teammate pass-back?', 'U10')).toContain('pdsa-law-12-fouls')
    expect(requiredPdsaSources('How far away is the free kick wall?', 'U10')).toContain('pdsa-law-13-free-kicks')
    expect(requiredPdsaSources('Stop the clock for injury?', 'U8')).toContain('pdsa-law-12-fouls')
  })
  it('does not permit an approval snapshot to authorize a conflicting saved answer', () => {
    const base = ruleScenarios.find((entry) => entry.id === 'u8-throw-redo')!
    const entry = { ...base, answer: 'Show a yellow card.' }
    const reviews: Record<string, BankApproval> = { [entry.id]: { reviewedBy: 'Test reviewer', reviewedOn: '2026-10-29', scenarioSnapshot: scenarioSnapshot(entry), sourceSnapshots: entry.sourceIds.map((id) => { const source = bankSources.find((item) => item.id === id)!; return { id, text: source.text, edition: source.edition } }) } }
    expect(isApprovedScenario(entry, reviews)).toBe(false)
  })
  it('removes the conflicting keeper exception from direct chat answers', () => {
    const result = rulebookFactAnswer('When is a goalie restricted from picking up the ball? U10')!
    expect(result.explanation).toContain('PDSA awards an indirect free kick')
    expect(result.explanation).not.toContain('attempted to kick')
  })
})
