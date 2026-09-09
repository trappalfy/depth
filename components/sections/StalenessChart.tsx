'use client'

import { useEffect, useState } from 'react'
import { copy } from '@/content/copy.en'
import { formatAge } from '@/lib/format'
import type { Snapshot } from '@/lib/snapshot'
import { buildStalenessCurve } from '@/lib/staleness'

// A viewBox in abstract units; the SVG scales to its container.
const W = 1000
const H = 260
const PAD_L = 44
const PAD_R = 16
const PAD_T = 16
const PAD_B = 28

const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

/** Brief §11.7: grid lines only, no legend for a single series, no gold. */
const GRID = 'rgba(255,255,255,.06)'

export function StalenessChart({ snapshot }: { snapshot: Snapshot }) {
  const [now, setNow] = useState(snapshot.observedAt)

  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(tick)
  }, [])

  const curve = buildStalenessCurve(snapshot.rows, now)
  if (curve.points.length === 0) return null

  const px = (x: number) => PAD_L + x * PLOT_W
  const py = (y: number) => PAD_T + (1 - y) * PLOT_H

  const line = curve.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x)},${py(p.y)}`).join(' ')
  const area = `${line} L${px(1)},${py(0)} L${px(0)},${py(0)} Z`

  // Quarters of the heartbeat, so the labels read 0h / 6h / 12h / 18h / 24h.
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
  const last = curve.points[curve.points.length - 1]

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={copy.sections.problem.chartAlt}
      >
        <defs>
          <linearGradient id="staleness-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.10)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={py(g)} y2={py(g)} stroke={GRID} strokeWidth="1" />
            <text
              x={PAD_L - 10}
              y={py(g) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--color-fg-faint)"
            >
              {Math.round((g * curve.heartbeatSeconds) / 3600)}h
            </text>
          </g>
        ))}

        {/* The heartbeat itself: the line a feed may not cross without going stale. */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={py(1)}
          y2={py(1)}
          stroke="rgba(255,255,255,.28)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        <path d={area} fill="url(#staleness-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* One annotation only: the oldest feed, at its true age. */}
        <circle cx={px(last.x)} cy={py(last.y)} r="3.5" fill="#FFFFFF" />
        <text
          x={px(last.x) - 8}
          y={py(last.y) - 10}
          textAnchor="end"
          fontSize="11"
          fill="var(--color-fg-faint)"
        >
          {curve.oldest?.symbol} · {formatAge(curve.maxAgeSeconds)}
        </text>

        <text x={PAD_L} y={H - 8} fontSize="11" fill="var(--color-fg-faint)">
          {curve.points.length} {copy.sections.problem.chartAxis}
        </text>
      </svg>

      <figcaption className="mt-4 text-[12px] text-fg-faint">
        {copy.sections.problem.chartCaption} {formatAge(Math.max(0, now - snapshot.observedAt))} ago,
        at block <span className="font-mono">{snapshot.blockNumber}</span>.
      </figcaption>
    </figure>
  )
}
