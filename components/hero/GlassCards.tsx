'use client'

import { useEffect, useState } from 'react'
import { copy } from '@/content/copy.en'
import { formatAge, heartbeatFraction } from '@/lib/format'
import type { FeedRow } from '@/lib/snapshot'

const glass =
  'rounded-[14px] border border-[var(--color-glass-border)] bg-[var(--color-glass)] p-4 backdrop-blur-[18px] backdrop-saturate-[120%]'

function ArrowButton() {
  return (
    <span className="group absolute right-4 top-4 flex h-[35px] w-[35px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#EDEDED]">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden
        className="text-ink-900 transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
      >
        <path d="M4 10L10 4M10 4H5M10 4v5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </span>
  )
}

export function GlassCards({
  tsla,
  observedAt,
}: {
  tsla: FeedRow | undefined
  observedAt: number
}) {
  // The age ticks locally from the server timestamp. No polling, and it never
  // claims to be fresher than the read it came from.
  const [now, setNow] = useState(observedAt)
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const age = tsla ? Math.max(0, now - tsla.updatedAt) : 0
  const fraction = tsla ? heartbeatFraction(age, tsla.heartbeat) : 0

  return (
    <>
      <div
        className={`${glass} anim-card1 absolute z-20 h-[110px] w-[214px] max-md:hidden`}
        style={{ left: '10.8%', top: '60.1%' }}
      >
        <p className="text-[11px] text-fg-faint">{copy.hero.cardA.label}</p>
        <p className="mt-2 text-[17px] font-semibold leading-tight text-white">
          {copy.hero.cardA.statement[0]}
          <br />
          {copy.hero.cardA.statement[1]}
        </p>
      </div>

      <div
        className={`${glass} anim-card2 absolute z-20 h-[110px] w-[214px] max-md:inset-x-6 max-md:w-auto`}
        style={{ right: '10.8%', top: '73.0%' }}
      >
        <ArrowButton />
        <p className="text-[11px] text-fg-faint">{copy.hero.cardB.label}</p>
        <p className="mt-1 text-[33px] font-semibold leading-none tabular-nums text-white">
          {tsla ? formatAge(age) : '—'}
        </p>
        <div className="mt-2 h-[3px] w-[98px] overflow-hidden rounded-[2px] bg-white/[0.14]">
          <div
            className="h-full rounded-[2px] bg-white transition-[width] duration-500"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>
    </>
  )
}
