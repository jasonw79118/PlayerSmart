import { useEffect, useRef } from 'react'
import { ArrowUp, BookOpenText, Plus, RotateCcw, ShieldCheck, User } from 'lucide-react'
import type { AskRefMessage } from '../lib/askref-chat'
import { neonAuthConfigured } from '../lib/neon-auth'

type RelatedRule = { id: string; title: string; text: string; section: string; sourceName: string; edition: string; sourceUrl: string }
type Props = {
  messages: AskRefMessage[]; draft: string; loading: boolean; relatedRules: RelatedRule[]
  onDraftChange: (value: string) => void; onSend: (question: string) => void
  onNewChat: () => void; onRetry: () => void
}

export function AskRefChat({ messages, draft, loading, relatedRules, onDraftChange, onSend, onNewChat, onRetry }: Props) {
  const bottom = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const latest = messages.at(-1)
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }) }, [messages, loading])
  useEffect(() => { if (!loading) composer.current?.focus() }, [loading])
  const send = () => { if (draft.trim() && !loading) onSend(draft) }
  return <section className="askref-chat" aria-label="AskRef chat">
    <header className="askref-chat-header">
      <div className="askref-chat-identity"><span className="askref-chat-avatar"><BookOpenText size={22} /></span><div><h1>AskRef</h1><p>{neonAuthConfigured ? 'PDSA rules, explained simply.' : 'PDSA rulebook lookups. AI service not connected.'}</p></div></div>
      <button className="button-secondary" onClick={() => { onNewChat(); composer.current?.focus() }}><Plus size={16} />New chat</button>
    </header>
    <div className="askref-chat-scroll">
      {!messages.length && <div className="askref-chat-welcome"><span className="askref-chat-welcome-icon"><BookOpenText size={30} /></span><p className="eyebrow">YOUR RULES ASSISTANT</p><h2>What happened on the field?</h2><p>Tell me about the play or ask a rules question. We can work through it together, one detail at a time.</p><div className="askref-chat-starters">{['Offside', 'Throw-ins', 'Restarts', 'Match duration'].map((topic) => <button key={topic} onClick={() => onSend(topic)}>{topic}<ArrowUp size={14} /></button>)}</div></div>}
      <div role="log" aria-label="Conversation with AskRef" aria-live="polite" aria-relevant="additions text" className="askref-chat-messages">
        {messages.map((message, index) => <article key={message.id} className={`askref-chat-message askref-chat-message-${message.role}`} aria-label={message.role === 'user' ? 'Your message' : 'AskRef message'}>
          <span className="askref-message-avatar" aria-hidden="true">{message.role === 'user' ? <User size={17} /> : <BookOpenText size={17} />}</span>
          <div className="askref-message-body"><p className="askref-message-author">{message.role === 'user' ? 'You' : 'AskRef'}</p>
            <div className={`askref-message-content${message.error ? ' askref-message-error' : ''}`} role={message.error && index === messages.length - 1 ? 'alert' : undefined}>{message.content}</div>
            {message.answer?.sayToThem && <div className="askref-say"><strong>You can say</strong><p>{message.answer.sayToThem}</p></div>}
            {message.answer?.ruleApplication && <details className="askref-chat-sources"><summary>Restart and discipline details</summary><p><strong>Restart:</strong> {message.answer.ruleApplication.restartType}</p><p><strong>Location:</strong> {message.answer.ruleApplication.location}</p><p><strong>Discipline:</strong> {message.answer.ruleApplication.discipline}</p></details>}
            {message.answer && !message.answer.clarification && <>
              {message.answer.division !== 'Not specified' && <p className="askref-message-meta">Applies to: {message.answer.division}</p>}
              {message.answer.answerOrigin === 'rulebook' && <p className="askref-message-meta">From the bundled PDSA rulebook summary</p>}
              {message.answer.ballPlacement && <div className="askref-chat-placement"><strong>Restart placement</strong><p>{message.answer.ballPlacement}</p>{message.answer.diagramId && <img className="askref-restart-diagram" src={`${import.meta.env.BASE_URL}askref-diagrams/${message.answer.diagramId}.svg`} alt={`Restart diagram: ${message.answer.diagramId.replaceAll('-', ' ')}`} />}</div>}
              {message.answer.recommendCoordinator && <p className="askref-chat-note">Check the unclear details with an experienced referee or the Referee Coordinator.</p>}
              {message.answer.citations.length > 0 && <details className="askref-chat-sources"><summary><ShieldCheck size={15} />Sources ({message.answer.citations.length})</summary>{message.answer.citations.map((source) => <div key={source.id}><p><strong>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}</strong></p>{source.excerpt && <details><summary>Read supporting text</summary><small>{source.excerptKind}</small><p>{source.excerpt}</p></details>}</div>)}</details>}
            </>}
            {message.error && index === messages.length - 1 && <button className="askref-retry" disabled={loading} onClick={onRetry}><RotateCcw size={14} />Try again</button>}
          </div>
        </article>)}
        {loading && <div className="askref-chat-thinking" role="status"><BookOpenText size={17} /><span>AskRef is checking the rules<span className="askref-typing-dots" aria-hidden="true">…</span></span></div>}
      </div>
      {!loading && latest?.error && relatedRules.length > 0 && <details className="askref-chat-local-rules"><summary>Browse related rulebook excerpts (not an AI answer)</summary>{relatedRules.map((entry) => <article className="rule-result" key={entry.id}><h3>{entry.title}</h3><p>{entry.text}</p><p className="rule-citation">{entry.sourceName} · {entry.edition} · {entry.section}</p>{entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Related IFAB law</a>}</article>)}</details>}
      <div ref={bottom} />
    </div>
    <div className="askref-chat-bottom"><form className="askref-chat-composer" aria-label="Message AskRef" onSubmit={(event) => { event.preventDefault(); send() }}>
      <textarea ref={composer} aria-label="Ask a soccer rules question" placeholder={latest?.answer?.clarification ? 'Reply to AskRef…' : 'Message AskRef…'} value={draft} onChange={(event) => onDraftChange(event.target.value)} maxLength={500} rows={2} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }} />
      <div className="askref-composer-controls"><span>Enter to send · Shift+Enter for a new line</span><button type="submit" aria-label="Submit rule question" disabled={loading || !draft.trim()}><ArrowUp size={19} /></button></div>
    </form><p className="askref-chat-disclaimer">AI explanations can be mistaken. Check the cited rules. Don’t share player names or personal details. <a href="https://www.theifab.com/laws/latest/" target="_blank" rel="noreferrer" aria-label="Open IFAB Laws of the Game">IFAB Laws</a></p></div>
  </section>
}
