import { copy } from '@/content/copy.en'
import { Card } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'

export function Limits() {
  return (
    <section id="limits" className="bg-ink-700 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {copy.sections.limits.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{copy.sections.limits.lede}</p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {copy.sections.limits.items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 2) * 60}>
              <Card>
                <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{item.title}</h3>
                <p className="mt-3 text-[15px] text-fg-muted">{item.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
