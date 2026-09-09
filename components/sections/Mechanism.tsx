import { copy } from '@/content/copy.en'
import { Card } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'

export function Mechanism() {
  return (
    <section id="mechanism" className="bg-ink-700 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="max-w-[16ch] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {copy.sections.mechanism.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">
            {copy.sections.mechanism.lede}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {copy.sections.mechanism.states.map((state, i) => (
            <Reveal key={state.name} delay={(i % 3) * 60}>
              <Card>
                <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{state.name}</h3>
                <p className="mt-3 text-[15px] text-fg-muted">{state.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-16 max-w-[68ch]">
            <h3 className="text-[22px] font-semibold tracking-[-0.01em]">
              {copy.sections.mechanism.invariantHeading}
            </h3>
            <p className="mt-4 text-[17px] text-fg-muted">
              {copy.sections.mechanism.invariantBody}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
