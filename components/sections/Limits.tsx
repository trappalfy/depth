import { Card } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'
import { copy } from '@/content/copy.en'

const { limits } = copy.sections

export function Limits() {
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
          {limits.items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 2) * 60}>
              <Card className="flex h-full flex-col">
                <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{item.title}</h3>
                <p className="mt-3 text-[15px] text-fg-muted">{item.body}</p>

                <div className="mt-6 border-t border-white/[0.06] pt-4">
                  <p className="text-[12px] text-fg-faint">{limits.coverLabel}</p>
                  <p className="mt-2 text-[15px] text-white">{item.cover}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
