import { useRef, useState } from 'react'
import { X, Plus, Minus, Locate } from 'lucide-react'
import { WorldMap } from './WorldMap'

interface MapModalProps {
  visited: Set<string>
  homeId?: string
  accent?: string
  onClose: () => void
}

interface Transform {
  scale: number
  x: number
  y: number
}

const clampScale = (s: number) => Math.min(6, Math.max(1, s))

export function MapModal({ visited, homeId, accent, onClose }: MapModalProps) {
  const [t, setT] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef({ dist: 0, midX: 0, midY: 0 })

  const initPinch = () => {
    const [a, b] = [...pointers.current.values()]
    pinch.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) initPinch()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 1) {
      setT((s) => ({ ...s, x: s.x + (e.clientX - prev.x), y: s.y + (e.clientY - prev.y) }))
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      const factor = pinch.current.dist ? dist / pinch.current.dist : 1
      setT((s) => ({
        scale: clampScale(s.scale * factor),
        x: s.x + (midX - pinch.current.midX),
        y: s.y + (midY - pinch.current.midY),
      }))
      pinch.current = { dist, midX, midY }
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 2) initPinch()
  }

  const onWheel = (e: React.WheelEvent) => {
    setT((s) => ({ ...s, scale: clampScale(s.scale * (e.deltaY < 0 ? 1.15 : 0.87)) }))
  }

  const zoom = (dir: 1 | -1) =>
    setT((s) => ({ ...s, scale: clampScale(s.scale * (dir === 1 ? 1.4 : 1 / 1.4)) }))
  const reset = () => setT({ scale: 1, x: 0, y: 0 })

  return (
    <div className="mapmodal" role="dialog" aria-modal="true">
      <header className="mapmodal__bar">
        <h2>Mapa-múndi</h2>
        <button className="iconbtn" onClick={onClose} aria-label="Fechar">
          <X size={22} />
        </button>
      </header>

      <div
        className="mapmodal__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="mapmodal__inner"
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})` }}
        >
          <WorldMap visited={visited} homeId={homeId} accent={accent} />
        </div>
      </div>

      <div className="mapmodal__controls">
        <button className="iconbtn iconbtn--solid" onClick={() => zoom(-1)} aria-label="Reduzir">
          <Minus size={20} />
        </button>
        <button className="iconbtn iconbtn--solid" onClick={reset} aria-label="Repor">
          <Locate size={18} />
        </button>
        <button className="iconbtn iconbtn--solid" onClick={() => zoom(1)} aria-label="Ampliar">
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}
