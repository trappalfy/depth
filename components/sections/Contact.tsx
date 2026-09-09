import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { copy } from '@/content/copy.en'

/**
 * The landing's closing call, and the target of the navbar's "Get in touch".
 * Brief §11.4 allows a primary button here and in the hero, nowhere else.
 */
export function Contact() {
  return (
    <section id="contact" className="scroll-mt-[86px] bg-ink-800 py-[160px] max-md:py-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <Reveal>
          <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {copy.sections.contact.heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">
            {copy.sections.contact.lede}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Button
              href={`mailto:${copy.contactEmail}`}
              className="h-[44px] px-5 text-[15px]"
            >
              {copy.sections.contact.cta}
            </Button>
            <Button href="/app" variant="text" className="text-[15px]">
              {copy.sections.contact.secondary}
            </Button>
          </div>

          <p className="mt-8 font-mono text-[13px] text-fg-muted">{copy.contactEmail}</p>
        </Reveal>
      </div>
    </section>
  )
}
