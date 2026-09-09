import { Reveal } from '@/components/ui/Reveal'
import { copy } from '@/content/copy.en'
import type { Snapshot } from '@/lib/snapshot'

const { limits } = copy.sections

/** A slash for the boundary, an arrow for the thing that covers it. */
function BoundaryMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <path d="M2 12L12 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function CoverMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <path
        d="M2 7h9M8 4l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Limits({ snapshot }: { snapshot: Snapshot }) {
  const covered = snapshot.coveredAssets
  const total = snapshot.totalAssets
  const coveredFraction = total > 0 ? covered / total : 0

  return (
    <section id="limits" className="scroll-mt-[86px] bg-ink-700 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {limits.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{limits.lede}</p>
        </Reveal>

        {/* Each boundary carries the thing that covers it. A limitation with no
            answer reads as an apology; with one, it reads as a scope. */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {limits.items.map((item, i) => {
            // Only the second boundary has a real figure behind it. The others
            // get no bar rather than a decorative one that implies a measurement.
            const showsCoverage = i === 1

            return (
              <Reveal key={item.title} delay={(i % 2) * 60}>
                <div className="flex h-full flex-col rounded-[14px] border border-[var(--color-glass-border)] bg-ink-800 p-6 transition-colors duration-[160ms] hover:border-white/[0.14] hover:bg-ink-600">
                  <p className="font-mono text-[12px] text-fg-faint">
                    {String(i + 1).padStart(2, '0')}
                  </p>

                  <div className="mt-4 flex gap-3">
                    <span className="mt-[5px] text-fg-faint">
                      <BoundaryMark />
                    </span>
                    <h3 className="text-[22px] font-semibold leading-snug tracking-[-0.01em]">
                      {item.title}
                    </h3>
                  </div>

                  <p className="mt-3 text-[15px] text-fg-muted">{item.body}</p>

                  {showsCoverage && (
                    <div className="mt-6">
                      <div className="flex items-baseline justify-between">
                        <p className="text-[12px] text-fg-faint">{limits.coverageLabel}</p>
                        <p className="font-mono text-[13px] tabular-nums text-fg-muted">
                          {covered} / {total}
                        </p>
                      </div>
                      <div className="mt-2 h-[3px] w-full rounded-[var(--radius-pill)] bg-white/[0.06]">
                        <div
                          className="h-full rounded-[var(--radius-pill)] bg-white/60"
                          style={{ width: `${Math.round(coveredFraction * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-auto border-t border-white/[0.06] pt-5">
                    <div className="flex gap-3">
                      <span className="mt-[3px] text-fg-faint">
                        <CoverMark />
                      </span>
                      <div>
                        <p className="text-[12px] text-fg-faint">{limits.coverLabel}</p>
                        <p className="mt-2 text-[15px] text-white">{item.cover}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
