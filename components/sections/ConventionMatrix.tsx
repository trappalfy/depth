import { Reveal } from '@/components/ui/Reveal'
import { copy } from '@/content/copy.en'

const { matrix } = copy.sections

/** The four cells, addressed by their two axes rather than listed flat. */
function cellFor(balance: string, price: string) {
  return matrix.rows.find((row) => row.balance === balance && row.price === price)
}

export function ConventionMatrix() {
  return (
    <section id="matrix" className="scroll-mt-[86px] bg-ink-800 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {matrix.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{matrix.lede}</p>
        </Reveal>

        {/* A real 2x2. The heading promises two axes; a flat list of four rows
            hides the fact that the correct answers lie on the diagonal. */}
        <div className="mt-14 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[200px_1fr_1fr] gap-4">
              <div />
              {matrix.prices.map((price) => (
                <div key={price} className="px-1">
                  <p className="text-[12px] text-fg-faint">{matrix.priceAxis}</p>
                  <p className="mt-1 font-mono text-[13px] text-white">{price}</p>
                </div>
              ))}

              {matrix.balances.map((balance) => (
                <div key={balance} className="contents">
                  <div className="flex items-center px-1">
                    <div>
                      <p className="text-[12px] text-fg-faint">{matrix.balanceAxis}</p>
                      <p className="mt-1 font-mono text-[13px] text-white">{balance}</p>
                    </div>
                  </div>

                  {matrix.prices.map((price) => {
                    const cell = cellFor(balance, price)
                    if (!cell) return <div key={price} />
                    const correct = cell.verdict === 'correct'
                    return (
                      <div
                        key={price}
                        className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <p
                            className="text-[17px] font-semibold"
                            style={{ color: correct ? 'var(--color-up)' : 'var(--color-down)' }}
                          >
                            {correct ? 'Correct' : 'Wrong'}
                          </p>
                          <p
                            className="font-mono text-[13px] tabular-nums"
                            style={{
                              color: correct ? 'var(--color-fg-faint)' : 'var(--color-down)',
                            }}
                          >
                            {cell.factor}
                          </p>
                        </div>
                        <p className="mt-3 text-[15px] text-fg-muted">{cell.note}</p>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 max-w-[68ch] text-[15px] text-fg-muted">{matrix.diagonalNote}</p>
      </div>
    </section>
  )
}
