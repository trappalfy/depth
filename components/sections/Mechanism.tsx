import { Card } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'
import { copy } from '@/content/copy.en'
import type { Snapshot } from '@/lib/snapshot'
import type { Status } from '@/lib/status'

const { mechanism } = copy.sections

export function Mechanism({ snapshot }: { snapshot: Snapshot }) {
  // The same classifier that drives the board, counted across the live market.
  const census = snapshot.rows.reduce<Partial<Record<Status, number>>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <section id="mechanism" className="scroll-mt-[86px] bg-ink-700 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {mechanism.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{mechanism.lede}</p>
        </Reveal>

        <div className="mt-14">
          <Reveal>
            <h3 className="text-[22px] font-semibold tracking-[-0.01em]">
              {mechanism.censusHeading}
            </h3>
            <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{mechanism.censusLede}</p>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {mechanism.states.map((state, i) => {
              const countable = state.status !== null
              const count = countable ? (census[state.status as Status] ?? 0) : null

              return (
                <Reveal key={state.name} delay={(i % 3) * 60}>
                  <Card>
                    <p className="text-[12px] text-fg-faint">{state.name}</p>

                    {count === null ? (
                      <p className="mt-2 text-[15px] text-fg-muted">
                        {mechanism.censusUncountable}
                      </p>
                    ) : (
                      <p
                        className={`mt-2 text-[33px] font-semibold leading-none tabular-nums ${
                          count === 0 ? 'text-fg-faint' : ''
                        }`}
                      >
                        {count}
                      </p>
                    )}

                    <p className="mt-4 text-[15px] text-fg-muted">{state.body}</p>
                  </Card>
                </Reveal>
              )
            })}
          </div>

          <p className="mt-8 text-[12px] text-fg-faint">
            {snapshot.rows.length} covered feeds, read from Robinhood Chain mainnet (chain{' '}
            {snapshot.chainId}) at block{' '}
            <span className="font-mono">{snapshot.blockNumber}</span>.
          </p>
        </div>

        <Reveal>
          <div className="mt-16 max-w-[68ch]">
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
