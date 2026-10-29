import { fireEvent } from '@testing-library/react'

export function signaturePointer(target: Element, type: string, x: number, y: number, pointerId = 1) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  fireEvent(target, event)
}

export function drawTestSignature(target: Element) {
  signaturePointer(target, 'pointerdown', 30, 50)
  signaturePointer(target, 'pointermove', 80, 100)
  signaturePointer(target, 'pointermove', 160, 40)
  signaturePointer(target, 'pointerup', 250, 90)
}
