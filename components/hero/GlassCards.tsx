'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { copy } from '@/content/copy.en'
import { formatAge, heartbeatFraction } from '@/lib/format'
import type { FeedRow } from '@/lib/snapshot'

/**
 * Brief §8 fixes the fill, the blur and the hairline, and §13.5 requires the
 * fill to stay within a few levels of the ground — so none of that moves. What
 * is added here is edge, not fill: a lit top edge, a dark bottom one and an
 * ambient shadow, which is what separates a plate of glass floating above the
 * scene from a flat grey rectangle drawn on it.
 */
// No `relative` here: both cards are already `absolute`, and the two rules
// fight in the stylesheet rather than in the class attribute — which pulled the
// right-hand card out of its corner and back into the flow.
const glass =
  'overflow-hidden rounded-[14px] border border-[var(--color-glass-border)] bg-[var(--color-glass)] p-4 backdrop-blur-[18px] backdrop-saturate-[120%] shadow-[inset_0_1px_0_rgba(255,255,255,.07),inset_0_-1px_0_rgba(0,0,0,.30),0_24px_48px_rgba(0,0,0,.45)]'

/**
 * Brief §8: 214×110. §10 shrinks them to 190×100 between 1024 and 1279, which
 * this does NOT do: at 190 the right card's label runs under the arrow button
 * and loses "· Chainlink", and the source of a live number is not the part that
 * gets dropped to save 24px.
 */
const size = 'h-[110px] w-[214px]'

/**
 * Brief §3: the object lights the cards through the blur. It only reaches the
 * right-hand one, so the left card is lit by the single warm source §4 allows —
 * the glow in the top-left corner. One light, one direction, both cards.
 */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(130% 130% at 0% 0%, rgba(255,255,255,.055), transparent 62%)',
      }}
    />
  )
}

/** Brief §8 puts a 35px arrow button here; it goes where the hero CTA goes. */
function ArrowButton() {
  return (
    <Link
      href={copy.hero.cta.href}
      aria-label={copy.hero.cardB.arrowLabel}
      title={copy.hero.cardB.arrowLabel}
      className="group absolute right-4 top-4 z-10 flex h-[35px] w-[35px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#EDEDED]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden
        className="text-ink-900 transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
      >
        <path d="M4 10L10 4M10 4H5M10 4v5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </Link>
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
    // The cards hang off the layout container, not off the raw viewport. Brief
    // §3 sets both — a 1132px container AND 10.8% edges — and the two agree at
    // 1440. Above it they diverge: 10.8% keeps growing while the container caps,
    // so a card pinned to the percentage drifts away from the column the H1 and
    // the navbar sit in. At 1920 that was 187px adrift, which is what makes a
    // card look torn out of some other layout. min(1132px, 78.4vw) is the same
    // container: 100% less two 10.8% edges.
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="relative mx-auto h-full w-full md:w-[min(1132px,78.4vw)]">
        <div
          className={`${glass} ${size} anim-card1 pointer-events-auto absolute left-0 max-md:hidden`}
          style={{ top: '60.1%' }}
        >
          <Sheen />
          <p className="relative text-[11px] text-fg-faint">{copy.hero.cardA.label}</p>
          {/* Two lines, per §8 — and they have to be two lines that fit 182px of
              inner width, or the card looks cropped rather than composed. */}
          <p className="relative mt-2 text-[17px] font-semibold leading-[1.3] text-white">
            {copy.hero.cardA.statement[0]}
            <br />
            {copy.hero.cardA.statement[1]}
          </p>
        </div>

        <div
          className={`${glass} ${size} anim-card2 pointer-events-auto absolute right-0 max-md:inset-x-6 max-md:w-auto`}
          style={{ top: '73.0%' }}
        >
          <Sheen />
          <ArrowButton />
          {/* Keeps clear of the 35px arrow button in the corner. */}
          <p className="relative pr-[44px] text-[11px] text-fg-faint">{copy.hero.cardB.label}</p>
          <p className="relative mt-1 text-[33px] font-semibold leading-none tabular-nums text-white">
            {tsla ? formatAge(age) : '—'}
          </p>
          <div className="relative mt-2 h-[3px] w-[98px] overflow-hidden rounded-[2px] bg-white/[0.14]">
            <div
              className="h-full rounded-[2px] bg-white transition-[width] duration-500"
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
