import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AskRefChat } from './AskRefChat'
import type { AskRefMessage } from '../lib/askref-chat'

const props = () => ({ messages: [] as AskRefMessage[], draft: 'How long is a quarter in U8?', loading: false, relatedRules: [], onDraftChange: vi.fn(), onSend: vi.fn(), onNewChat: vi.fn(), onRetry: vi.fn() })

describe('AskRef chat composer and evidence', () => {
  it('sends with Enter, reserves Shift+Enter for a line break and avoids sending during composition', () => {
    const controls = props()
    render(<AskRefChat {...controls} />)
    const composer = screen.getByRole('textbox', { name: 'Ask a soccer rules question' })
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: true })
    fireEvent.keyDown(composer, { key: 'Enter', isComposing: true })
    expect(controls.onSend).not.toHaveBeenCalled()
    fireEvent.keyDown(composer, { key: 'Enter' })
    expect(controls.onSend).toHaveBeenCalledWith('How long is a quarter in U8?')
  })
  it('keeps sources and diagrams attached to their assistant message', () => {
    const controls = props()
    const answer = { division: 'U8', explanation: 'This is the goal-kick placement.', citations: [{ id: 'source', authority: 'PDSA' as const, version: '2025/26', label: 'PDSA Law 16', excerpt: 'A supporting rule summary.' }], ballPlacement: 'On the goal line, outside the goal box.', diagramId: 'goal-kick-u6-u8', recommendCoordinator: false }
    render(<AskRefChat {...controls} messages={[{ id: 1, role: 'user', content: 'Where is the kick?' }, { id: 2, role: 'assistant', content: answer.explanation, answer }]} />)
    expect(screen.getByRole('log')).toHaveTextContent('Where is the kick?')
    expect(screen.getByRole('log')).toHaveTextContent(answer.explanation)
    expect(screen.getByRole('log')).toHaveTextContent('PDSA Law 16')
    expect(screen.getByRole('img', { name: 'Restart diagram: goal kick u6 u8' })).toHaveAttribute('src', '/askref-diagrams/goal-kick-u6-u8.svg')
  })
  it('shows a checking indicator and disables duplicate sends', () => {
    const controls = props()
    render(<AskRefChat {...controls} loading />)
    expect(screen.getByRole('status')).toHaveTextContent('AskRef is checking the rules')
    expect(screen.getByRole('button', { name: 'Submit rule question' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(controls.onSend).not.toHaveBeenCalled()
  })
})
