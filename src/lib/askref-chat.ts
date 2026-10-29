export type AskRefCitation = { id: string; authority: 'PDSA' | 'IFAB'; version: string; label: string; url?: string; excerpt?: string; excerptKind?: string }
export type AskRefResponse = { division: string; explanation: string; citations: AskRefCitation[]; ballPlacement: string | null; diagramId: string | null; recommendCoordinator: boolean; sourceVersions?: { PDSA: string; IFAB: string }; clarification?: string; sayToThem?: string; answerOrigin?: string; reviewStatus?: string; reviewQueue?: string; sourceStatus?: string; ruleApplication?: { restartType: string; location: string; discipline: string } }
export type AskRefMessage = { id: number; role: 'user' | 'assistant'; content: string; answer?: AskRefResponse; error?: boolean }
export type AskRefHistory = Array<{ role: 'user' | 'assistant'; content: string; clarification?: boolean }>

export async function readAskRefResponse(response: Response): Promise<AskRefResponse> {
  const unavailable = 'AskRef’s AI service is unavailable right now. Please try again shortly. Basic rulebook lookups still work.'
  const text = await response.text()
  let result: unknown
  try { result = JSON.parse(text) } catch { throw new Error(unavailable) }
  if (!result || typeof result !== 'object') throw new Error(unavailable)
  const answer = result as Partial<AskRefResponse> & { error?: unknown }
  if (!response.ok) throw new Error(typeof answer.error === 'string' ? answer.error : unavailable)
  if (typeof answer.explanation !== 'string' || !answer.explanation.trim() || !Array.isArray(answer.citations)
    || typeof answer.division !== 'string' || typeof answer.recommendCoordinator !== 'boolean'
    || !answer.citations.every((citation) => citation && typeof citation.id === 'string' && typeof citation.label === 'string')
    || (answer.ruleApplication !== undefined && (!answer.ruleApplication || !['restartType', 'location', 'discipline'].every((key) => typeof (answer.ruleApplication as Record<string, unknown>)[key] === 'string')))) {
    throw new Error('AskRef returned an incomplete answer. Please try again.')
  }
  return answer as AskRefResponse
}

export function validAskRefHistory(value: unknown): value is AskRefHistory {
  return Array.isArray(value) && value.length <= 12
    && value.reduce((total, item) => total + (typeof item?.content === 'string' ? item.content.length : 0), 0) <= 10000
    && value.every((item, index) => item && item.role === (index % 2 === 0 ? 'user' : 'assistant')
      && typeof item.content === 'string' && item.content.trim().length > 0 && item.content.length <= (item.role === 'user' ? 500 : 1600)
      && (item.clarification === undefined || (item.role === 'assistant' && typeof item.clarification === 'boolean')))
    && value.length % 2 === 0
}

export function messageHistory(messages: AskRefMessage[]): AskRefHistory {
  // Failed requests are not completed conversation turns and are safe to retry.
  const history: AskRefHistory = messages.filter((item, index) => !item.error && !(item.role === 'user' && messages[index + 1]?.error))
    .slice(-12).map((item) => ({ role: item.role, content: item.content, ...(item.role === 'assistant' ? { clarification: Boolean(item.answer?.clarification) } : {}) }))
  while (history.reduce((total, item) => total + item.content.length, 0) > 10000) history.splice(0, 2)
  return history
}
