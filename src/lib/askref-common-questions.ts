import { bankSources, normalizeBankQuestion, refereeDivisions, type RuleScenario } from './askref-bank'
import { inferQuestionDivisions, divisionOnlyReply, type AskRefContext } from './askref-context'
import type { AskRefResponse } from './askref-chat'
import { IFAB_RULES_VERSION, PDSA_RULEBOOK_VERSION } from './pdsa-rules'

type Topic = {
  id: string; title: string; questions: string[]; sourceIds: string[]; needsDivision?: boolean
  answer: (division: string) => { explanation: string; sayToThem: string; recommendCoordinator?: boolean }
}
const small = (division: string) => ['U6', 'U8'].includes(division)
const topics: Topic[] = [
  {
    id: 'throw-placement-explainer', title: 'Throw-ins',
    questions: ['Where do throw-ins get placed?', 'Where do I take a throw in?', 'Where is a throw-in taken?', 'Where do you stand for a throw in?', 'Where do throw ins get place?'],
    sourceIds: ['pdsa-law-15-throw-in'],
    answer: (division) => ({ explanation: division === 'U6'
      ? 'U6 uses kick-ins instead of throw-ins. Place the ball on or outside the touchline and kick it onto the field. Another player must touch it before the kicker plays it again. Teaching retakes are unlimited all season; after multiple unsuccessful attempts the coach should choose another kicker.'
      : `${division === 'All divisions' ? 'For divisions using throw-ins, take' : `For ${division}, take`} the throw-in at the spot where the ball crossed the touchline (sideline). Face the field, with part of each foot on the line or on the ground outside it, and throw with both hands from behind and over the head.${division === 'All divisions' ? ' U6 uses kick-ins instead.' : ''}`,
      sayToThem: division === 'U6' ? 'Ball on or outside the sideline. Kick it into the field, then wait for another player to touch it.' : 'Back to where the ball went out. Both feet at the sideline, both hands behind and over your head.' }),
  },
  {
    id: 'throw-mulligan-explainer', title: 'Throw-ins',
    questions: ['What divisions get mullegans for throw-ins?', 'Which divisions get mulligans for throw-ins?', 'Who gets a redo on a throw in?', 'Do we get a second try on throw-ins?', 'Are throw in retakes allowed?', 'Does U8 get throw-in mulligans?'],
    sourceIds: ['pdsa-law-15-throw-in'],
    answer: (division) => ({ explanation: division === 'U8'
      ? 'U8 gets a mulligan (a teaching retake) for an illegal throw-in throughout the season, unless the coaches, commissioner and Referee Coordinator agree otherwise. Explain what to fix before the retake.'
      : division === 'U6' ? 'U6 uses kick-ins, so the throw-in mulligan rule does not apply.'
        : division !== 'All divisions' ? `${division} has no throw-in mulligans in the PDSA 2025/2026 issue.`
          : 'U8 gets a teaching retake for an illegal throw-in throughout the season unless coaches, commissioner and Referee Coordinator agree otherwise. U6 uses kick-ins. U10, U12, U14 and U18 have no throw-in mulligans in this PDSA issue.',
      sayToThem: division === 'U8' ? 'Try that again: both feet at the sideline and both hands behind and over your head.' : 'U8 has the teaching retake; the older divisions do not. U6 uses kick-ins.' }),
  },
  {
    id: 'offside-player-explainer', title: 'Offside', needsDivision: true,
    questions: ['How do I explain off-sides to U10 players?', 'How do I explain offside to players?', 'Explain offside simply', 'What is offside?', 'How does offside work?', 'Is offside called?'],
    sourceIds: ['pdsa-law-11-offside', 'IFAB-2025-26-LAW-11'],
    answer: (division) => small(division)
      ? { explanation: `${division} does not call offside under PDSA rules.`, sayToThem: 'We do not call offside in this division.' }
      : { explanation: `${division} uses offside. Check the attacker when a teammate plays the ball, not when it arrives. In the opponents’ half, being nearer the goal line than BOTH the ball and the second-last opponent puts a player in an offside position. Level is onside, and hands/arms do not count. Position alone is not a foul: the player must become involved by playing the ball, affecting an opponent or gaining an advantage from a rebound or save. No offside directly from a throw-in, goal kick or corner. An offside offence gives an indirect free kick where it occurs.`, sayToThem: 'When your teammate plays the ball, stay level with or behind the ball or the second-last opponent. Just standing ahead is not a foul unless you become involved.' },
  },
  {
    id: 'field-areas-explainer', title: 'Field areas',
    questions: ['Describe the different areas of the field?', 'What are the different areas of the field?', 'Explain the field markings', 'What are the lines and boxes called?', 'What is the difference between the goal area and penalty area?'],
    sourceIds: ['IFAB-2025-26-LAW-1', 'pdsa-law-10-goals'],
    answer: () => ({ explanation: 'Touchlines (sidelines) are the long boundaries; goal lines are the end boundaries. The halfway line divides the field, with the centre mark and centre circle in the middle. The goal area is the small box in front of goal; the penalty area is the larger box. The penalty mark is inside the larger box, with the penalty arc outside it. Corner arcs mark the corner-kick areas. Lines belong to the areas they enclose. Youth fields can use different sizes and markings. PDSA U6/U8 has a special goal-box rule: players may pass through but must not touch the ball inside it.', sayToThem: 'The small box is the goal area. The bigger box is the penalty area. The long lines are sidelines; the end lines are goal lines.' }),
  },
  {
    id: 'keeper-handling-explainer', title: 'Goalkeeper', needsDivision: true,
    questions: ['When is a goalie restricted from picking up the ball?', 'When can the goalkeeper not pick up the ball?', 'When is a keeper not allowed to use hands?', 'Can a keeper pick up a back pass?', 'Can the goalie pick up a teammates throw in?'],
    sourceIds: ['pdsa-law-3-players', 'pdsa-law-10-goals', 'pdsa-law-12-fouls', 'IFAB-2025-26-LAW-12'],
    answer: (division) => small(division)
      ? { explanation: `${division} has no goalkeeper under PDSA Law 3. Apply the division’s no-touch goal-box rule and indirect-kick rules instead of giving a player goalkeeper handling privileges.`, sayToThem: 'There is no goalkeeper in this division.' }
      : { explanation: `${division}: PDSA awards an indirect free kick for goalkeeper handling after a deliberate teammate pass-back or teammate throw-in. Do not import an IFAB exception to waive that local rule. Outside their own penalty area, goalkeepers follow ordinary handling restrictions. After releasing hand possession, they cannot handle again until another player touches it. Holding the ball beyond eight seconds gives a corner kick. Ask the coordinator about an uncertain incident using PDSA first.`, sayToThem: 'Under PDSA rules, you cannot handle a deliberate teammate pass-back or teammate throw-in.' },
  },
  {
    id: 'cards-difference-explainer', title: 'Cards', needsDivision: true,
    questions: ['How do I describe the difference between a yellow card and a red card?', 'What is the difference between yellow and red cards?', 'Explain yellow and red cards', 'What does a yellow card mean?', 'What does a red card mean?'],
    sourceIds: ['pdsa-law-12-fouls', 'IFAB-2025-26-LAW-12'],
    answer: (division) => small(division)
      ? { explanation: `PDSA ${division} does not award cards. Explain the offence to the player and use the applicable indirect free kick. Get coordinator support for serious misconduct.`, sayToThem: 'We do not use cards in this division. I will explain what happened and how to restart.' }
      : { explanation: `${division}: yellow is a formal caution; red is a sending-off. A reckless challenge requires yellow; excessive force or a challenge endangering an opponent requires red. A second yellow in the same match also means a sending-off. A red card can be given without a previous yellow. PDSA provides a one-match suspension for a red or second yellow, subject to review, and does not use temporary dismissals.`, sayToThem: 'Yellow is a caution. Red means you are sent off. Two yellows in the same game also mean you are sent off.' },
  },
  {
    id: 'direct-kick-explainer', title: 'Free kicks', needsDivision: true,
    questions: ['When do direct kicks get awarded?', 'When is a direct free kick awarded?', 'What causes a direct kick?', 'What is a direct free kick?', 'Which fouls are direct free kicks?'],
    sourceIds: ['pdsa-law-12-fouls', 'pdsa-law-13-free-kicks', 'IFAB-2025-26-LAW-12'],
    answer: (division) => small(division)
      ? { explanation: `${division}: PDSA makes all fouls indirect free kicks, including handball. Explain the offence to the player. Do not apply the older divisions’ direct-kick rule.`, sayToThem: 'In this division the free kick is indirect. Another player must touch it before a goal can count.' }
      : { explanation: `${division}: direct free kicks include careless, reckless or excessively forceful trips, kicks, pushes and challenges, holding an opponent, and handball offences. Not every contact or ball-to-arm touch is an offence. A direct kick may score straight into the opponents’ goal. If a defender commits a direct-kick offence inside their own penalty area while the ball is in play, the restart is a penalty kick. The type of restart and any card are separate decisions.`, sayToThem: 'That offence is a direct free kick. You can score straight into the other team’s goal.' },
  },
  {
    id: 'indirect-kick-explainer', title: 'Free kicks', needsDivision: true,
    questions: ['When do in-direct kicks get awarded?', 'When is an indirect free kick awarded?', 'What causes an indirect kick?', 'What is an indirect free kick?', 'Which fouls are indirect free kicks?'],
    sourceIds: ['pdsa-law-12-fouls', 'pdsa-law-11-offside', 'pdsa-law-13-free-kicks', 'IFAB-2025-26-LAW-12', 'IFAB-2025-26-LAW-13'],
    answer: (division) => ({ explanation: small(division)
      ? `${division}: all fouls are indirect under PDSA rules, including handball. Explain the offence to the player. Another player must touch the ball before a goal can count. Offside is not called in this division.`
      : `${division}: examples include offside, dangerous play without contact, blocking an opponent’s progress without contact, prohibited goalkeeper handling inside their own penalty area, and many second-touch offences after a restart. This is an examples list, not every case. PDSA also gives an indirect kick for intentional heading. The ball must touch another player before a goal can count; signal an indirect kick with your arm raised. Holding the ball beyond eight seconds is a corner-kick offence, not an indirect kick.`,
      sayToThem: 'This is indirect. Another player must touch the ball before a goal can count.' }),
  },
  {
    id: 'clock-stoppage-explainer', title: 'Match timing',
    questions: ['What causes the clock to stop in game?', 'When does the clock stop?', 'Do I stop the clock when the ball goes out?', 'Does the clock stop for fouls?', 'Do we add stoppage time?', 'Do I stop the clock for an injury?'],
    sourceIds: ['pdsa-law-7-duration', 'pdsa-law-12-fouls', 'pdsa-appendix-b-weather'],
    answer: () => ({ explanation: 'PDSA says no added time for ordinary stoppages. Its Law 12 also says the clock must not be stopped for injury, regardless of severity. Stop play when safety requires it; the injury clock continues. Approved water breaks and weather suspensions follow their separate league procedures; confirm those arrangements with the Referee Coordinator.', sayToThem: 'I am stopping play for safety. Under our rules, the injury clock continues.', recommendCoordinator: true }),
  },
]

function normalize(question: string) {
  return normalizeBankQuestion(question.toLowerCase().replace(/\b(?:in|for)\s+(?=(?:u\s*-?\s*\d{1,2}|\d{1,2}\s*u|under[ -]?(?:\d{1,2}|six|eight|ten|twelve|fourteen|eighteen))\b)/g, '')
    .replace(/off[- ]sides?/g, 'offside').replace(/in[- ]direct/g, 'indirect')
    .replace(/mullegans?/g, 'mulligan').replace(/mulligans/g, 'mulligan').replace(/throw[- ]ins?/g, 'throw in'))
}
const topicFor = (question: string) => topics.find((topic) => topic.questions.some((variant) => normalize(variant) === normalize(question)))
// Compare the evidence on each request as well as when building the catalog.
const evidence = new Map(topics.map((topic) => [topic.id, topic.sourceIds.map((id) => bankSources.find((source) => source.id === id)?.text)]))

export function commonRuleAnswer(question: string, context: AskRefContext = []): AskRefResponse | null {
  const prior = context.at(-1)
  const topic = topicFor(question) ?? (prior && divisionOnlyReply(question) ? topicFor(prior.question) : undefined)
  if (!topic || topic.sourceIds.some((id, index) => !bankSources.find((source) => source.id === id)?.text
    || bankSources.find((source) => source.id === id)?.text !== evidence.get(topic.id)?.[index])) return null
  const divisions = inferQuestionDivisions(question, context)
  if (divisions.length > 1 || divisions.some((division) => !refereeDivisions.includes(division as typeof refereeDivisions[number]))) return null
  if (!divisions.length && topic.needsDivision) {
    const clarification = 'Which division is the game in: U6, U8, U10, U12, U14 or U18? The local rule differs by division.'
    return { division: 'Not specified', explanation: clarification, clarification, citations: [], ballPlacement: null, diagramId: null, recommendCoordinator: false, answerOrigin: 'clarification' }
  }
  const division = divisions[0] ?? 'All divisions'
  const answer = topic.answer(division)
  return {
    division, ...answer, recommendCoordinator: Boolean(answer.recommendCoordinator),
    citations: topic.sourceIds.map((id) => {
      const source = bankSources.find((entry) => entry.id === id)!
      return { id, authority: source.authority, version: source.version, label: source.label, url: source.url, excerpt: source.text, excerptKind: 'Bundled rule summary; not a verbatim rulebook quotation' }
    }),
    ballPlacement: topic.id === 'throw-placement-explainer' && division !== 'U6' ? 'Take the throw-in from the point where the ball left the field, on the touchline.' : null,
    diagramId: topic.id === 'throw-placement-explainer' && division !== 'U6' ? 'throw-in' : null,
    answerOrigin: 'rulebook', sourceVersions: { PDSA: PDSA_RULEBOOK_VERSION, IFAB: IFAB_RULES_VERSION },
  }
}

export const commonQuestionScenarios: RuleScenario[] = topics.flatMap((topic) => (topic.needsDivision ? [...refereeDivisions] : ['All divisions']).map((division) => {
  const answer = topic.answer(division)
  return {
    id: `${topic.id}${division === 'All divisions' ? '' : `-${division.toLowerCase()}`}`, topic: topic.title, audience: 'Coach' as const,
    divisions: division === 'All divisions' ? refereeDivisions : [division as typeof refereeDivisions[number]],
    questions: topic.questions, sourceIds: topic.sourceIds, answer: answer.explanation, sayToThem: answer.sayToThem,
    needsCoordinator: Boolean(answer.recommendCoordinator),
  }
}))
