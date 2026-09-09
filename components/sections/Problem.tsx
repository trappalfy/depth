import { StalenessChart } from '@/components/sections/StalenessChart'
import { CountUp } from '@/components/ui/CountUp'
import { Reveal } from '@/components/ui/Reveal'
import { copy } from '@/content/copy.en'
import type { Snapshot } from '@/lib/snapshot'

export function Problem({ snapshot }: { snapshot: Snapshot }) {
  const values = [
    snapshot.totalAssets,
    snapshot.coveredAssets,
    snapshot.totalAssets - snapshot.coveredAssets,
  ]

  return (
    <section
      id="problem"
      className="relative overflow-hidden bg-ink-700 py-[160px] max-md:py-16"
    >
      {/* Brief §11.5, the object's second permitted reappearance: its light
          behind the main figures, with no silhouette left at all. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[10%] top-[62%] h-[420px] w-[520px] -translate-y-1/2 rounded-full opacity-[0.5] blur-[130px]"
        style={{ background: 'radial-gradient(closest-side, var(--color-amber-600), transparent)' }}
      />

      <div className="relative mx-auto max-w-[1132px] px-6">
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
                  <CountUp value={values[i]} />
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-24 max-md:mt-16">
          <Reveal>
            <h3 className="text-[22px] font-semibold tracking-[-0.01em]">
              {copy.sections.problem.chartHeading}
            </h3>
            <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">
              {copy.sections.problem.chartLede}
            </p>
          </Reveal>

          <div className="mt-10">
            <StalenessChart snapshot={snapshot} />
          </div>
        </div>
      </div>
    </section>
  )
}
