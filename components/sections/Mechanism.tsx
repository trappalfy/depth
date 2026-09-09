import { Reveal } from '@/components/ui/Reveal'
import { copy } from '@/content/copy.en'
import type { Snapshot } from '@/lib/snapshot'
import type { Status } from '@/lib/status'

const { mechanism } = copy.sections

/** How far along the fuse each tier sits, for the rail marks. */
const TIER_COUNT = mechanism.tiers.length

export function Mechanism({ snapshot }: { snapshot: Snapshot }) {
  // The same classifier that drives the board, counted across the live market.
  const census = snapshot.rows.reduce<Partial<Record<Status, number>>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  const countFor = (name: string): number | null => {
    const state = mechanism.states.find((s) => s.name === name)
    if (!state || state.status === null) return null
    return census[state.status as Status] ?? 0
  }

  return (
    <section id="mechanism" className="scroll-mt-[86px] bg-ink-700 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {mechanism.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{mechanism.lede}</p>
        </Reveal>

        {/* The fuse itself: four answers on one rail, from conducting to blown.
            Every state belongs to exactly one, which is what makes it a fuse
            rather than a list of conditions. */}
        <div className="mt-20 max-md:mt-14">
          <Reveal>
            <h3 className="text-[22px] font-semibold tracking-[-0.01em]">
              {mechanism.tiersHeading}
            </h3>
          </Reveal>

          <div className="relative mt-10">
            {/* The rail. It brightens as the tiers escalate, so the eye reads
                the same direction the logic runs. */}
            <div
              aria-hidden
              className="absolute left-[7px] top-2 bottom-2 w-px max-md:left-[7px]"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(255,255,255,.10), rgba(255,255,255,.40))',
              }}
            />

            <div className="space-y-0">
              {mechanism.tiers.map((tier, i) => (
                <Reveal key={tier.name} delay={Math.min(i, 2) * 60}>
                  <div className="relative flex gap-6 py-8 max-md:gap-4">
                    <div className="relative z-10 mt-1.5 shrink-0">
                      <span
                        aria-hidden
                        className="block h-[15px] w-[15px] rounded-full border bg-ink-700"
                        style={{
                          borderColor: `rgba(255,255,255,${0.14 + (i / (TIER_COUNT - 1)) * 0.5})`,
                        }}
                      />
                    </div>

                    <div className="grid flex-1 gap-6 md:grid-cols-[minmax(0,22ch)_minmax(0,1fr)]">
                      <div>
                        <p className="text-[17px] font-semibold leading-snug">{tier.name}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tier.states.map((name) => {
                            const count = countFor(name)
                            return (
                              <span
                                key={name}
                                className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-2.5 py-1 text-[12px] ${
                                  count === null
                                    ? 'bg-white/[0.04] text-fg-faint'
                                    : count === 0
                                      ? 'bg-white/[0.06] text-fg-muted'
                                      : 'bg-white/[0.10] text-white'
                                }`}
                              >
                                {name}
                                {count !== null && (
                                  <span className="font-mono tabular-nums">{count}</span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      <p className="text-[15px] text-fg-muted">{tier.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* The census, as one strip of identical tiles. Mixing a 33px number
            with a paragraph is what made these ragged before. */}
        <div className="mt-20 max-md:mt-14">
          <Reveal>
            <h3 className="text-[22px] font-semibold tracking-[-0.01em]">
              {mechanism.censusHeading}
            </h3>
            <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{mechanism.censusLede}</p>
          </Reveal>

          <div className="mt-8 grid grid-cols-5 gap-4 max-md:grid-cols-2">
            {mechanism.states
              .filter((state) => state.status !== null)
              .map((state, i) => (
                <Reveal key={state.name} delay={Math.min(i, 2) * 60}>
                  <div className="h-full rounded-[14px] border border-[var(--color-glass-border)] bg-ink-800 p-5">
                    <p className="text-[12px] leading-snug text-fg-faint">{state.name}</p>
                    <p
                      className={`mt-3 font-mono text-[33px] leading-none tabular-nums ${
                        (census[state.status as Status] ?? 0) === 0 ? 'text-fg-faint' : 'text-white'
                      }`}
                    >
                      {census[state.status as Status] ?? 0}
                    </p>
                  </div>
                </Reveal>
              ))}
          </div>

          <p className="mt-6 max-w-[80ch] text-[12px] text-fg-faint">
            {mechanism.censusFootnote}
          </p>
          <p className="mt-2 text-[12px] text-fg-faint">
            {snapshot.rows.length} covered feeds, read from Robinhood Chain mainnet (chain{' '}
            {snapshot.chainId}) at block <span className="font-mono">{snapshot.blockNumber}</span>.
          </p>
        </div>

        <Reveal>
          <div id="invariant" className="mt-20 max-w-[68ch] scroll-mt-[86px] max-md:mt-14">
            <h3 className="text-[22px] font-semibold tracking-[-0.01em]">
              {mechanism.invariantHeading}
            </h3>
            <p className="mt-4 text-[17px] text-fg-muted">{mechanism.invariantBody}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
