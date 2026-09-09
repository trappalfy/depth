import { copy } from '@/content/copy.en'
import { Reveal } from '@/components/ui/Reveal'
import type { Snapshot } from '@/lib/snapshot'

export function Problem({ snapshot }: { snapshot: Snapshot }) {
  const values = [
    snapshot.totalAssets,
    snapshot.coveredAssets,
    snapshot.totalAssets - snapshot.coveredAssets,
  ]

  return (
    <section id="problem" className="bg-ink-700 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {copy.sections.problem.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">
            {copy.sections.problem.lede}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {copy.sections.problem.stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 60}>
              <div>
                <p className="text-[12px] text-fg-faint">{stat.label}</p>
                <p className="mt-2 text-[48px] font-semibold tabular-nums tracking-[-0.02em]">
                  {values[i]}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
