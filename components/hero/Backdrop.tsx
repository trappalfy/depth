'use client'

import { useEffect, useRef } from 'react'

export function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0

    // 50 motes, denser in the upper half (brief §4).
    const motes = Array.from({ length: 50 }, () => ({
      x: Math.random(),
      y: Math.random() < 0.65 ? Math.random() * 0.5 : 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }))

    // Arrow expressions, not hoisted declarations: TypeScript keeps the
    // non-null narrowing of `canvas` and `ctx` only for closures created
    // after the guard, and treats a hoisted function as callable before it.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (t: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.28)'
      for (const m of motes) {
        // ±2 px drift over a 20-second cycle.
        const dy = reduced ? 0 : Math.sin(t / 20000 + m.phase) * 2
        ctx.fillRect(Math.round(m.x * w), Math.round(m.y * h + dy), 1, 1)
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }

    resize()

    draw(0)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 62% at 2% 0%, rgba(84,77,88,0.85), transparent 62%), #101010',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
