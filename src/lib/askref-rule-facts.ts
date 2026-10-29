import { pdsaRulesKnowledge, PDSA_RULEBOOK_VERSION, IFAB_RULES_VERSION } from './pdsa-rules'
import { inferQuestionDivisions, type AskRefContext } from './askref-context'
import type { AskRefResponse } from './askref-chat'
import { verifiedRestartPlacements } from './verified-restart-placements'
import { commonRuleAnswer } from './askref-common-questions'
import { trainingGuideAnswer } from './askref-training'
import { expandedTrainingAnswer, pendingCountdownAnswer } from './askref-expanded-training'
import { enforcePdsaAuthority } from './askref-authority'

function goalKickFact(question: string, context: AskRefContext): AskRefResponse | null {
  const prior = context.at(-1)
  const divisionReply = /^(?:(?:what|how) about\s+)?(?:u\s*-?\s*)?\d{1,2}[?.!\s]*$/i.test(question.trim())
  const topic = divisionReply && prior ? prior.question : question
  const normalized = topic.toLowerCase().replace(/goal[- ]?kicks?/g, 'goal kick').replace(/[?!.]/g, '').trim()
  const definition = /^(?:what (?:is|are)(?: a| the)?|whats(?: a| the)?|explain(?: a| the)?) goal kick$/.test(normalized)
  const placement = /\bgoal kick\b/.test(normalized) && /\bwhere\b/.test(normalized)
    && !/\b(after|if|when|offside|foul|penalty|touch|touched|score|scored|corner|free kick)\b/.test(normalized)
  if (!definition && !placement) return null
  const divisions = inferQuestionDivisions(question, context)
  if (divisions.length > 1) return null
  const source = pdsaRulesKnowledge.find((entry) => entry.id === 'pdsa-law-16-goal-kick' && entry.verified)
  const definitionEvidence = 'A goal kick is awarded when the whole ball crosses the goal line after last touching an attacker and no goal is scored.'
  const placementEvidence = 'In U6/U8, place the ball anywhere on the goal line (not the goal box), and opponents must remain in their own half until the ball is in play.'
  if (!source || !source.text.includes(definitionEvidence)) return null
  const division = divisions[0]
  if (placement && !division) {
    const clarification = 'Which division is the game in? Goal-kick placement is different for U6/U8.'
    return { division: 'Not specified', explanation: clarification, clarification, citations: [], ballPlacement: null, diagramId: null, recommendCoordinator: false, answerOrigin: 'clarification' }
  }
  if (placement && !['U6', 'U8'].includes(division)) return null
  const small = placement && source.text.includes(placementEvidence)
  if (placement && !small) return null
  const verified = small ? verifiedRestartPlacements.find((entry) => entry.id === 'goal-kick-u6-u8' && entry.sourceIds.includes(source.id)) : undefined
  if (small && !verified) return null
  const explanation = small
    ? `For ${division}, place the goal kick anywhere on the goal line, outside the goal box. Opponents must stay in their own half until the ball is in play.`
    : 'A goal kick is a restart for the defending team when the whole ball goes over their goal line, outside the goal, after last touching an attacking player. For example, an attacker shoots wide and the ball goes out over the goal line: goal kick.'
  return {
    division: small ? division : 'All divisions', explanation,
    sayToThem: small ? 'Goal kick. Put the ball on the goal line, outside the goal box. Other team, back into your own half.' : 'The attacking team touched it last before it went over the goal line. Goal kick to the defending team.',
    citations: [{ id: source.id, authority: 'PDSA', version: PDSA_RULEBOOK_VERSION, label: `${source.section} · PDSA ${PDSA_RULEBOOK_VERSION}`, excerpt: small ? placementEvidence.replace('In U6/U8', `In ${division}`) : definitionEvidence, excerptKind: 'Bundled PDSA rulebook summary' }],
    ballPlacement: small ? `For ${division}, place the ball anywhere on the goal line, not in the goal box. Opponents remain in their own half until the ball is in play.` : null,
    diagramId: verified?.diagramId ?? null, recommendCoordinator: false, answerOrigin: 'rulebook', sourceVersions: { PDSA: PDSA_RULEBOOK_VERSION, IFAB: IFAB_RULES_VERSION },
  }
}

// Direct rulebook facts, not generated answers or coordinator-approved scenarios.
// Each statement is checked against the bundled source before it can be used.
const durations: Record<string, { periods: number; minutes: number; unit: string; evidence: string }> = {
  U6: { periods: 4, minutes: 8, unit: 'quarters', evidence: 'U6 games have four 8-minute quarters.' },
  U8: { periods: 4, minutes: 10, unit: 'quarters', evidence: 'U8 games have four 10-minute quarters.' },
  U10: { periods: 2, minutes: 25, unit: 'halves', evidence: 'U10 games have two 25-minute halves' },
  U12: { periods: 2, minutes: 30, unit: 'halves', evidence: 'U12, U14, and U18 games have two 30-minute halves' },
  U14: { periods: 2, minutes: 30, unit: 'halves', evidence: 'U12, U14, and U18 games have two 30-minute halves' },
  U18: { periods: 2, minutes: 30, unit: 'halves', evidence: 'U12, U14, and U18 games have two 30-minute halves' },
}
const durationWords = new Set('how what whats many supposed to be on at it its about each per is are a an the do does in for of our my we us can you tell me please soccer football youth pdsa game games match matches half halves quarter quarters quater quaters period periods play playing last lasts length lenght long duration time minutes minute minits minit normal regulation total full scheduled and halftime break breaks'.split(' '))

function isDurationQuestion(question: string) {
  const normalized = question.toLowerCase().replace(/['\u2019]/g, '').replace(/\bu\s*-?\s*\d{1,2}\b|\b\d{1,2}\s*u\b|\bunder[ -]?(?:\d{1,2}|six|eight|ten|twelve|fourteen|eighteen)\b/g, '')
  const words = normalized.match(/[a-z]+/g) ?? []
  return words.length > 0 && words.every((word) => durationWords.has(word))
    && /\b(game|games|match|matches|half|halves|quarter|quarters|quater|quaters|period|periods|halftime)\b/.test(normalized)
    && /\b(long|length|lenght|duration|time|minutes|minute|minits|halftime)\b/.test(normalized)
}

function rawRulebookFactAnswer(question: string, context: AskRefContext = []): AskRefResponse | null {
  const countdown = pendingCountdownAnswer(question)
  if (countdown) return countdown
  const expanded = expandedTrainingAnswer(question, context)
  if (expanded) return expanded
  const common = commonRuleAnswer(question, context)
  if (common) return common
  const training = trainingGuideAnswer(question, context)
  if (training) return training
  const goalKick = goalKickFact(question, context)
  if (goalKick) return goalKick
  const shortFollowUp = /^(?:(?:and|what about|how about|for|in)\s+)?(?:u\s*-?\s*\d{1,2}|\d{1,2}\s*u|under[ -]?\d{1,2})[?.!\s]*$/i.test(question.trim())
  const previousTopic = [...context].reverse().find((turn) => !/^(?:(?:and|what about|how about|for|in)\s+)?(?:u\s*-?\s*\d{1,2}|\d{1,2}\s*u|under[ -]?\d{1,2}|\d{1,2})[?.!\s]*$/i.test(turn.question.trim()))?.question
  const lastQuestion = previousTopic && isDurationQuestion(previousTopic) ? previousTopic : undefined
  const answeringDurationClarification = context.at(-1)?.clarification && /division|age group/i.test(context.at(-1)!.clarification)
  const isReply = Boolean(lastQuestion && (shortFollowUp || (answeringDurationClarification && /^\d{1,2}[.!?\s]*$/.test(question))))
  if (!isDurationQuestion(question) && !isReply) return null
  const divisions = inferQuestionDivisions(question, context)
  if (divisions.length > 1 || (divisions.length === 1 && !durations[divisions[0]])) return null
  if (!divisions.length) return { division: 'Not specified', explanation: 'Which division is the game in? Game length differs by division.', clarification: 'Which division is the game in? Game length differs by division.', citations: [], ballPlacement: null, diagramId: null, recommendCoordinator: false, answerOrigin: 'clarification' }
  const division = divisions[0]
  const fact = durations[division]
  const source = pdsaRulesKnowledge.find((entry) => entry.id === 'pdsa-law-7-duration' && entry.verified)
  const halftimeEvidence = fact.periods === 4 ? 'U6 and U8 quarter breaks are 2 minutes and halftime is 5 minutes.' : 'U10 games have two 25-minute halves; U12, U14, and U18 games have two 30-minute halves; halftime is 5 minutes.'
  if (!source || !source.text.includes(fact.evidence) || !source.text.includes(halftimeEvidence)) return null
  const timing = `${division} games have ${fact.periods === 2 ? 'two' : 'four'} ${fact.minutes}-minute ${fact.unit}`
  const halftimeOnly = /halftime/i.test(isReply ? lastQuestion! : question) && !/game|match|quarter|quater|period|halves/i.test(isReply ? lastQuestion! : question)
  const explanation = halftimeOnly ? `${division} halftime is 5 minutes.` : `${timing}: ${fact.periods * fact.minutes} minutes of playing time, with a 5-minute halftime.${fact.periods === 4 ? ' Quarter breaks are 2 minutes.' : ''}${source.text.includes('Game times can change based on final player count or weather.') ? ' Approved roster or weather adjustments can change the schedule.' : ''}`
  return {
    division, explanation, sayToThem: halftimeOnly ? 'Halftime is five minutes.' : `${division} plays ${fact.periods === 2 ? 'two' : 'four'} ${fact.minutes}-minute ${fact.unit}.`,
    citations: [{ id: source.id, authority: 'PDSA', version: PDSA_RULEBOOK_VERSION, label: `${source.section} · PDSA ${PDSA_RULEBOOK_VERSION}`, excerpt: `${timing}. Halftime is 5 minutes.`, excerptKind: `Division-specific summary for ${division}, derived from the bundled PDSA Law 7 text.` }],
    ballPlacement: null, diagramId: null, recommendCoordinator: false, answerOrigin: 'rulebook', sourceVersions: { PDSA: PDSA_RULEBOOK_VERSION, IFAB: IFAB_RULES_VERSION },
  }
}

export function rulebookFactAnswer(question: string, context: AskRefContext = []): AskRefResponse | null {
  const answer = rawRulebookFactAnswer(question, context)
  return answer ? enforcePdsaAuthority(answer) : null
}
