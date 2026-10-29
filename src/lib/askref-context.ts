import { questionDivisions, refereeDivisions } from './askref-bank'

export type AskRefContext = Array<{ question: string; clarification: string }>

export function validAskRefContext(value: unknown): value is AskRefContext {
  return Array.isArray(value) && value.length <= 3 && value.every((turn) => turn && typeof turn.question === 'string'
    && turn.question.trim().length > 0 && turn.question.length <= 500
    && typeof turn.clarification === 'string' && turn.clarification.trim().length > 0 && turn.clarification.length <= 500)
}

export function divisionOnlyReply(question: string) {
  const normalized = question.toLowerCase().trim().replace(/[.!?]+$/, '')
  return /^(?:(?:it(?:'s| is)|we(?:'re| are))\s+)?(?:u\s*-?\s*|under[ -]?)?(6|8|10|12|14|18)(?:\s*(?:division|soccer))?$/.test(normalized)
}

export function inferQuestionDivisions(question: string, context: AskRefContext) {
  const current = questionDivisions(question)
  if (current.length) return [...new Set(current)]
  const last = context.at(-1)
  if (last && /division|age group/i.test(last.clarification) && divisionOnlyReply(question)) {
    const number = question.match(/\d+/)?.[0]
    if (number && refereeDivisions.includes(`U${number}` as typeof refereeDivisions[number])) return [`U${number}`]
  }
  for (let index = context.length - 1; index >= 0; index -= 1) {
    const turn = context[index]
    const divisions = [...new Set(questionDivisions(turn.question))]
    if (divisions.length) return divisions
    if (index > 0 && /division|age group/i.test(context[index - 1].clarification) && divisionOnlyReply(turn.question)) {
      return [`U${turn.question.match(/\d+/)?.[0]}`]
    }
  }
  return []
}
