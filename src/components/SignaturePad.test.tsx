import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SignaturePad, hasSignature } from './SignaturePad'
import { drawTestSignature, signaturePointer } from '../test-signature'

describe('finger signature pad', () => {
  it('captures a touch stroke, retains it for display and supports clearing', () => {
    const change = vi.fn()
    const { rerender } = render(<SignaturePad label="Coach signature" onChange={change} />)
    const pad = screen.getByRole('img', { name: 'Coach signature' })
    drawTestSignature(pad)
    const strokes = change.mock.calls[0][0]
    expect(hasSignature(strokes)).toBe(true)
    rerender(<SignaturePad label="Coach signature" onChange={change} value={strokes} />)
    expect(pad.querySelectorAll('polyline')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Clear coach signature' }))
    expect(change).toHaveBeenLastCalledWith([])
  })
  it('rejects an empty tap and cancelled stroke and blocks changes when signed', () => {
    const change = vi.fn()
    const { rerender } = render(<SignaturePad label="Coach signature" onChange={change} />)
    const pad = screen.getByRole('img', { name: 'Coach signature' })
    signaturePointer(pad, 'pointerdown', 20, 20)
    signaturePointer(pad, 'pointerup', 20, 20)
    expect(change).not.toHaveBeenCalled()
    signaturePointer(pad, 'pointerdown', 20, 20)
    signaturePointer(pad, 'pointermove', 60, 60)
    signaturePointer(pad, 'pointercancel', 90, 60)
    expect(change).not.toHaveBeenCalled()
    rerender(<SignaturePad label="Coach signature" onChange={change} disabled />)
    drawTestSignature(pad)
    expect(change).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Clear coach signature' })).toBeNull()
  })
})
