import { copy } from '@/content/copy.en'
import { Reveal } from '@/components/ui/Reveal'

export function Integration() {
  return (
    <section className="bg-ink-800 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {copy.sections.integration.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">
            {copy.sections.integration.lede}
          </p>
        </Reveal>

        <Reveal delay={60}>
          <pre className="mt-14 overflow-x-auto rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 font-mono text-[13px] leading-relaxed">
            <code>
              <span className="text-fg-faint">- </span>
              <span className="text-fg-muted">{copy.sections.integration.before}</span>
              {'\n'}
              <span className="text-fg-faint">+ </span>
              <span className="text-white">{copy.sections.integration.after}</span>
            </code>
          </pre>
          <p className="mt-4 text-[12px] text-fg-faint">{copy.sections.integration.note}</p>
        </Reveal>
      </div>
    </section>
  )
}
