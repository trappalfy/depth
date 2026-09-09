import { copy } from '@/content/copy.en'
import { Reveal } from '@/components/ui/Reveal'

export function ConventionMatrix() {
  return (
    <section className="bg-ink-800 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {copy.sections.matrix.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{copy.sections.matrix.lede}</p>
        </Reveal>

        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="text-[12px] text-fg-faint">
                <th className="pb-3 font-normal">Balance</th>
                <th className="pb-3 font-normal">Price</th>
                <th className="pb-3 font-normal">Result</th>
                <th className="pb-3 font-normal">Why</th>
              </tr>
            </thead>
            <tbody>
              {copy.sections.matrix.rows.map((row) => (
                <tr key={`${row.balance}-${row.price}`} className="border-t border-white/[0.06]">
                  <td className="py-4 font-mono text-[13px] text-white">{row.balance}</td>
                  <td className="py-4 text-[15px] text-fg-muted">{row.price}</td>
                  <td
                    className="py-4 text-[15px] font-semibold"
                    style={{
                      color: row.verdict === 'correct' ? 'var(--color-up)' : 'var(--color-down)',
                    }}
                  >
                    {row.verdict === 'correct' ? 'Correct' : 'Wrong'}
                  </td>
                  <td className="py-4 text-[15px] text-fg-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
