import data from './askref-expanded-training.json'
import pendingRules from './askref-pending-rules.json'
import { bankSources, normalizeBankQuestion, refereeDivisions, type RuleScenario } from './askref-bank'
import { divisionOnlyReply, inferQuestionDivisions, type AskRefContext } from './askref-context'
import type { AskRefResponse } from './askref-chat'
import { IFAB_RULES_VERSION, PDSA_RULEBOOK_VERSION } from './pdsa-rules'
import { verifiedRestartPlacements } from './verified-restart-placements'

type Entry = typeof data[number]
const small = (division: string) => division === 'U6' || division === 'U8'
const normalize = (question: string) => normalizeBankQuestion(question.replace(/^please explain:\s*/i, '')
  .replace(/\b(?:in|for)\s+(?=(?:u\s*-?\s*\d{1,2}|under[ -]?\d{1,2})\b)/gi, ''))
const matchQuestion = (question: string) => data.find((entry) => [entry.question, ...entry.aliases].some((variant) => normalize(variant) === normalize(question)))

function answerEntry(entry: Entry, division: string): AskRefResponse {
  let explanation = entry.explanation
  let sayToThem = entry.sayToThem
  let restartType = entry.restart
  let location = entry.location
  let discipline = entry.discipline
  let recommendCoordinator = Boolean('recommendCoordinator' in entry && entry.recommendCoordinator)
  let ballPlacement: string | null = null
  let diagramId: string | null = null
  const sourceIds = new Set(entry.sourceIds)
  if (entry.policy !== 'none') explanation = `${division}: ${explanation}`
  if (entry.policy === 'throw') {
    sourceIds.add('pdsa-law-15-throw-in')
    if (division === 'U6') {
      explanation = 'U6 uses kick-ins, not throw-ins. Put the ball on or outside the touchline and kick it into play. Another player must touch it before the kicker plays it again. Teaching retakes are unlimited all season; after multiple unsuccessful attempts, the coach should choose another kicker.'
      sayToThem = 'Ball on or outside the sideline. Kick it into the field, then wait for another player’s touch.'
      restartType = 'U6 kick-in; teaching retake if needed.'
      location = 'On or outside the touchline at the exit point.'
      discipline = 'No cards under the PDSA U6 rule.'
    } else {
      explanation += division === 'U8' ? ' PDSA U8 normally gets a teaching retake for an illegal throw throughout the season unless coaches, commissioner and coordinator agree otherwise.'
        : ` PDSA ${division} does not receive throw-in mulligans; an incorrectly performed throw that enters play normally goes to the opponents, subject to advantage.`
      if (division === 'U8') {
        restartType += ' For an illegal throw, apply the U8 teaching retake rather than the ordinary turnover.'
        discipline = 'No cards in U8. Explain the offence; seek coordinator support for serious misconduct.'
        if ([101, 102].includes(entry.number)) explanation = 'U8: opponents must give the thrower the required 2 metres (2 yards) of space and must not unfairly distract or interfere. PDSA awards no cards in this division; explain the offence and apply the relevant local restart. Get coordinator support for persistent or serious misconduct.'
        if (entry.number === 104) {
          explanation = 'U8: PDSA normally grants a teaching retake for an illegal throw unless coaches, commissioner and coordinator agree otherwise. The general IFAB advantage example must not silently replace that local instruction; confirm an unclear situation with the coordinator.'
          recommendCoordinator = true
        }
      }
    }
  }
  if (entry.policy === 'goal') {
    sourceIds.add('pdsa-law-16-goal-kick')
    const placement = verifiedRestartPlacements.find((item) => item.id === (small(division) ? 'goal-kick-u6-u8' : 'goal-kick-general'))!
    if (entry.number === 107) {
      explanation = `${division}: ${placement.text.replace('For U6/U8, ', '')}`
      ballPlacement = placement.text.replace('For U6/U8', `For ${division}`)
      diagramId = placement.diagramId
      location = ballPlacement
    } else if (small(division) && [108, 109, 112].includes(entry.number)) {
      explanation = `${division}: PDSA does not require a goal kick to leave the penalty area before a touch. Place it on the goal line outside the goal box. Opponents must remain in their own half until the ball is in play; use this local retreat rule.`
      sayToThem = 'Opponents back into your own half until the ball is in play.'
    }
  }
  if (entry.policy === 'keeper' && small(division)) {
    sourceIds.add('pdsa-law-3-players')
    explanation = `${division} has no goalkeeper under PDSA Law 3. Do not grant a player goalkeeper handling privileges. Apply the division’s field-player and restart rules instead.`
    sayToThem = 'There is no goalkeeper in this division.'
    restartType = 'Establish the actual field-player or restart offence; no goalkeeper privilege.'
    discipline = 'No cards in this division.'
  }
  if (entry.policy === 'wall') {
    const distance = small(division) ? 4 : 8
    explanation = `${division}: the PDSA free-kick wall distance is ${distance} yards from the ball. This overrides the general adult IFAB wall distance. It does not automatically change corner-kick or throw-in distances.`
    sayToThem = `Defenders, ${distance} yards back.`
    location = `${distance} yards from the ball; use the applicable kick location.`
  }
  if ((entry.policy === 'foul' || entry.policy === 'cards') && small(division)) {
    sourceIds.add('pdsa-law-12-fouls')
    if (entry.policy === 'cards') {
      explanation = `${division}: PDSA does not award cards. Explain the offence and apply the applicable indirect kick. Stop unsafe conduct and get a responsible league official’s help for serious misconduct; do not leave a young referee to handle a threatening situation alone.`
      sayToThem = 'We do not use cards here. I am getting the coordinator’s help for serious misconduct.'
      recommendCoordinator = true
    } else if ([118, 119, 136, 168, 169].includes(entry.number)) {
      explanation = `${division}: all fouls give an indirect free kick under PDSA rules, including contact and handball offences. This division does not use the older divisions’ direct-kick or penalty procedure. Explain the offence. Another player must touch the ball before a goal can count; the raised arm signals indirect.`
      sayToThem = 'This is indirect. Another player must touch it before a goal can count.'
    } else explanation += ' Apply PDSA’s modification: all fouls are indirect and no cards are awarded in this division. Explain the offence to the player.'
    restartType = 'Indirect free kick if a foul is established; the original restart may remain if the ball was already out.'
    discipline = 'No cards under this division’s PDSA rules; get support for serious misconduct.'
  }
  if (entry.policy === 'subs') {
    sourceIds.add('pdsa-law-3-players')
    explanation = division === 'U6' ? 'U6 substitutions may be made anytime under PDSA’s modified procedure.'
      : `${division}: substitutions are allowed on either team’s goal kick, goal, caution or injury, or on your own corner/throw-in. If the team taking a corner or throw-in substitutes, the opponents may also substitute. Wait at midfield and enter when summoned; halftime substitutions do not require alerting the referee.`
    sayToThem = division === 'U6' ? 'U6 may substitute anytime.' : 'Wait at midfield; enter when I call you on at a permitted stoppage.'
  }
  if (entry.policy === 'coach' && division === 'U6') {
    explanation = 'PDSA permits one U6 coach on the field throughout play. That exception does not permit interference, threats or unsafe conduct; get league support when needed.'
    sayToThem = 'One U6 coach may be on the field. Please follow the safety and conduct rules.'
  }
  if (entry.number === 103 && division !== 'U6') {
    ballPlacement = 'Take the throw-in at the point where the ball left the field, on the touchline.'
    diagramId = 'throw-in'
  }
  return { division, explanation, sayToThem, recommendCoordinator, ballPlacement, diagramId,
    ruleApplication: { restartType, location, discipline },
    citations: [...sourceIds].map((id) => { const source = bankSources.find((item) => item.id === id)!; return { id, authority: source.authority, version: source.version, label: source.label, url: source.url, excerpt: source.text, excerptKind: 'Checked rule summary; not a verbatim quotation' } }),
    answerOrigin: 'rulebook', sourceVersions: { PDSA: PDSA_RULEBOOK_VERSION, IFAB: IFAB_RULES_VERSION } }
}

export function expandedTrainingAnswer(question: string, context: AskRefContext = []): AskRefResponse | null {
  const entry = matchQuestion(question) ?? (divisionOnlyReply(question) && context.at(-1) ? matchQuestion(context.at(-1)!.question) : undefined)
  if (!entry || entry.sourceIds.some((id) => !bankSources.some((source) => source.id === id))) return null
  const divisions = inferQuestionDivisions(question, context)
  if (divisions.length > 1 || divisions.some((division) => !refereeDivisions.includes(division as typeof refereeDivisions[number]))) return null
  if (!divisions.length && entry.policy !== 'none') {
    const clarification = 'Which division is this game in? I need the division to apply the PDSA restart or discipline rule.'
    return { division: 'Not specified', explanation: clarification, clarification, citations: [], ballPlacement: null, diagramId: null, recommendCoordinator: false, answerOrigin: 'clarification' }
  }
  return answerEntry(entry, divisions[0] ?? 'All divisions')
}

export function pendingCountdownAnswer(question: string): AskRefResponse | null {
  if (!['Do we use a five-second throw-in countdown?', 'What is the five second throw in rule?', 'Do we use 5 seconds for throw ins?'].some((variant) => normalize(variant) === normalize(question))) return null
  const rule = pendingRules[0]
  return { division: 'Not specified', explanation: 'IFAB 2026/27 introduces a visible five-second countdown for unfair throw-in delay, with the throw awarded to the opponents on expiry. This is different from an incorrectly delivered throw. The checked PDSA Issue 09 rulebook adopts IFAB 2025/26; PDSA adoption of this newer countdown has not been established. Confirm the competition’s adoption with the Referee Coordinator before using it.',
    sayToThem: 'Let me confirm which throw-in timing rule our competition has adopted.', recommendCoordinator: true, ballPlacement: null, diagramId: null,
    citations: [{ id: rule.id, authority: 'IFAB', version: rule.edition, label: 'IFAB 2026/27 countdown — PDSA adoption pending', url: rule.url, excerpt: rule.summary }],
    answerOrigin: 'version-check', sourceStatus: rule.status, sourceVersions: { PDSA: PDSA_RULEBOOK_VERSION, IFAB: IFAB_RULES_VERSION } }
}

export const expandedTrainingScenarios: RuleScenario[] = data.map((entry) => ({
  id: `young-ref-guide-${entry.number}`, audience: entry.number >= 166 ? 'Coach' : 'Player', topic: entry.number <= 105 ? 'Throw-ins' : 'Expanded referee training',
  divisions: refereeDivisions, questions: [entry.question, ...entry.aliases], sourceIds: [...new Set([...entry.sourceIds,
    ...(entry.policy === 'keeper' ? ['pdsa-law-3-players'] : []), ...(entry.policy === 'foul' || entry.policy === 'cards' || entry.policy === 'throw' ? ['pdsa-law-12-fouls'] : [])])],
  answer: entry.policy === 'none' ? entry.explanation : 'Ask for division first.\n\n' + refereeDivisions.map((division) => answerEntry(entry, division).explanation).join('\n\n'),
  sayToThem: entry.policy === 'none' ? entry.sayToThem : 'Which division is this game?', needsCoordinator: true,
  ruleApplication: { restartType: entry.restart, location: entry.location, discipline: entry.discipline },
}))
