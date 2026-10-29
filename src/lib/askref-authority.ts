import { pdsaRulesKnowledge, PDSA_RULEBOOK_VERSION } from './pdsa-rules'
import type { AskRefResponse } from './askref-chat'

export const ASKREF_AUTHORITY_POLICY = 'PDSA overrides adopted IFAB; both override saved, training and generated answers.'
const small = (division: string) => ['U6', 'U8'].includes(division)
export function requiredPdsaSources(question: string, division: string): string[] {
  const text = question.toLowerCase()
  const ids = new Set<string>()
  if (/throw.?in|mulligan|mullegan|kick.?in/.test(text)) ids.add('pdsa-law-15-throw-in')
  if (/goal.?kick/.test(text)) ids.add('pdsa-law-16-goal-kick')
  if (/off.?side/.test(text)) ids.add('pdsa-law-11-offside')
  if (/goalie|goalkeeper|\bkeeper\b/.test(text)) { ids.add('pdsa-law-3-players'); ids.add('pdsa-law-12-fouls') }
  if (/earring|jewell?ery|bracelet|cast|brace\b/.test(text)) ids.add('pdsa-law-4-equipment')
  if (/free.?kick|\bwall\b/.test(text)) ids.add('pdsa-law-13-free-kicks')
  if (/card|foul|handball|heading|header|injur/.test(text)) ids.add('pdsa-law-12-fouls')
  if (/clock|stoppage time|add(?:ed)? time/.test(text)) { ids.add('pdsa-law-7-duration'); ids.add('pdsa-law-12-fouls') }
  if (small(division) && /penalty|direct kick/.test(text)) ids.add('pdsa-law-12-fouls')
  return [...ids]
}

type Candidate = { explanation?: string; sayToThem?: string; ballPlacement?: string | null; ruleApplication?: { restartType: string; location: string; discipline: string } }
export function pdsaAuthorityConflict(answer: Candidate, division: string): { sourceId: string; explanation: string } | null {
  const text = [answer.explanation, answer.sayToThem, answer.ballPlacement, ...Object.values(answer.ruleApplication ?? {})].filter(Boolean).join(' ')
  // Conservative checks for known local overrides, not a general semantic proof.
  const positive = (pattern: RegExp) => [...text.matchAll(new RegExp(pattern.source, 'gi'))].some((match) => !/\b(?:not|no|never|without|rather than|instead of|cannot|doesn.t)\b/i.test(text.slice(Math.max(0, match.index! - 45), match.index)))
  if (small(division) && positive(/(?:award|give|show|requires?|gets?|receives?) (?:a |an |the )?(?:yellow card|red card|direct free kick|penalty kick)/)) return { sourceId: 'pdsa-law-12-fouls', explanation: `PDSA ${division}: all fouls result in an indirect free kick, the offence must be explained, and no cards are awarded. Get coordinator support for serious misconduct.` }
  if (small(division) && positive(/offside (?:applies|is called|must be called)/)) return { sourceId: 'pdsa-law-11-offside', explanation: `PDSA does not call offside in ${division}.` }
  if (small(division) && positive(/(?:goalkeeper|keeper) (?:may|can|is allowed to) (?:handle|pick up|use)/)) return { sourceId: 'pdsa-law-3-players', explanation: `PDSA ${division} has no goalkeeper. Do not grant goalkeeper handling privileges.` }
  if (small(division) && /goal.?kick/i.test(text) && positive(/place (?:the )?ball.{0,25}(?:within|inside) (?:the )?goal area/)) return { sourceId: 'pdsa-law-16-goal-kick', explanation: `PDSA ${division}: place a goal kick on the goal line outside the goal box. Opponents remain in their own half until the ball is in play.` }
  if (/^U\d+$/.test(division) && positive(/(?:free.kick|wall).{0,40}(?:10 yards|ten yards|9\.15 m)/)) return { sourceId: 'pdsa-law-13-free-kicks', explanation: `PDSA ${division} uses a ${small(division) ? '4' : '8'}-yard free-kick wall distance. Do not substitute the general IFAB distance.` }
  if (!small(division) && /^U\d+$/.test(division) && positive(/(?:gets?|receives?|allows?) (?:a |an )?(?:throw.in )?(?:mulligan|teaching retake)/)) return { sourceId: 'pdsa-law-15-throw-in', explanation: `PDSA ${division} does not allow throw-in mulligans. U8’s local teaching-retake provision does not apply to this division.` }
  if (positive(/(?:stop|pause|freeze)(?:s|ped)? (?:the )?(?:match )?clock.{0,40}injur/)) return { sourceId: 'pdsa-law-12-fouls', explanation: 'PDSA says the match clock must not be stopped for injury, regardless of severity. Stop play for safety when required; the clock continues.' }
  if (/(?:exception|unless).{0,150}(?:attempt(?:ed)? to kick|clearly kicked)/i.test(text) && /(?:teammate|team.mate|throw.in|pass.back)/i.test(text)) return { sourceId: 'pdsa-law-12-fouls', explanation: 'PDSA awards an indirect free kick for goalkeeper handling after a deliberate teammate pass-back or teammate throw-in. Do not use an IFAB exception to waive this stated local rule. Ask the coordinator about an uncertain incident.' }
  return null
}

export function enforcePdsaAuthority<T extends AskRefResponse>(answer: T): AskRefResponse {
  if (answer.clarification || answer.answerOrigin === 'version-check') return answer
  const conflict = pdsaAuthorityConflict(answer, answer.division)
  if (!conflict) return answer
  const source = pdsaRulesKnowledge.find((entry) => entry.id === conflict.sourceId && entry.verified)
  return { division: answer.division, explanation: conflict.explanation, citations: source ? [{ id: source.id, authority: 'PDSA', version: PDSA_RULEBOOK_VERSION, label: `${source.section} · PDSA ${PDSA_RULEBOOK_VERSION}`, url: source.documentUrl, excerpt: source.text, excerptKind: 'Controlling PDSA rule summary' }] : [],
    ballPlacement: null, diagramId: null, recommendCoordinator: true, answerOrigin: 'rulebook', sourceVersions: answer.sourceVersions }
}
