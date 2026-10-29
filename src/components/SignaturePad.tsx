import { useEffect, useRef, useState, type PointerEvent } from 'react'
import './SignaturePad.css'

export type SignaturePoint = [number, number]
export type SignatureStroke = SignaturePoint[]
const emptySignature: SignatureStroke[] = []
export function hasSignature(strokes: SignatureStroke[] = []) {
  return strokes.some((stroke) => stroke.length > 1 && stroke.some((point) => point[0] !== stroke[0][0] || point[1] !== stroke[0][1]))
}

export function SignaturePad({ label, value = emptySignature, onChange, disabled = false }: {
  label: string; value?: SignatureStroke[]; onChange: (strokes: SignatureStroke[]) => void; disabled?: boolean
}) {
  const active = useRef<{ pointerId: number; points: SignatureStroke } | null>(null)
  const [drawing, setDrawing] = useState<SignatureStroke>([])
  useEffect(() => { active.current = null; setDrawing([]) }, [value, disabled])
  function point(event: PointerEvent<SVGSVGElement>): SignaturePoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return [Math.round(Math.max(0, Math.min(600, (event.clientX - rect.left) * 600 / (rect.width || 600)))), Math.round(Math.max(0, Math.min(180, (event.clientY - rect.top) * 180 / (rect.height || 180))))]
  }
  function start(event: PointerEvent<SVGSVGElement>) {
    if (disabled || active.current || event.button !== 0) return
    event.preventDefault()
    active.current = { pointerId: event.pointerId, points: [point(event)] }
    setDrawing(active.current.points)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (disabled || active.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    active.current.points = [...active.current.points, point(event)]
    setDrawing(active.current.points)
  }
  function finish(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    if (active.current?.pointerId !== event.pointerId) return
    const stroke = [...active.current.points, point(event)]
    active.current = null
    setDrawing([])
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!disabled && !cancelled && hasSignature([stroke])) onChange([...value, stroke])
  }
  return <div className="signature-pad">
    <svg role="img" aria-label={label} aria-disabled={disabled} viewBox="0 0 600 180" preserveAspectRatio="none" onPointerDown={start} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={() => { active.current = null; setDrawing([]) }}>
      <line className="signature-pad-baseline" x1="20" x2="580" y1="145" y2="145" />
      {[...value, ...(drawing.length ? [drawing] : [])].map((stroke, index) => <polyline key={index} points={stroke.map((coordinates) => coordinates.join(',')).join(' ')} />)}
      {!value.length && !drawing.length && <text x="300" y="90" textAnchor="middle">Sign here with your finger, mouse or stylus</text>}
    </svg>
    {!disabled && <button type="button" className="button-secondary" disabled={!value.length && !drawing.length} aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { active.current = null; setDrawing([]); onChange([]) }}>Clear signature</button>}
  </div>
}
