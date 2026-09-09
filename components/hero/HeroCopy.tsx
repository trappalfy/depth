import { copy } from '@/content/copy.en'
import { Button } from '@/components/ui/Button'

export function HeroCopy() {
  return (
    <div className="relative z-20 flex flex-col items-center text-center">
      {/* Was clamp(32px, 3.85vw, 62px) — 56px at 1440, the size brief §7 sets.
          Raised one step: 66px at 1440, 76px once the viewport stops adding
          room. Tracking stays -0.025em, which counts for more the larger the
          type gets, and the line still breaks by hand into the brief's two. */}
      <h1
        className="anim-h1 font-semibold text-white"
        style={{ fontSize: 'clamp(34px, 4.6vw, 76px)', lineHeight: 1, letterSpacing: '-0.025em' }}
      >
        {copy.hero.h1[0]}
        <br />
        {copy.hero.h1[1]}
      </h1>

      <p
        className="anim-sub mt-[54px] max-w-[304px] text-fg-muted max-md:max-w-[84vw]"
        style={{ fontSize: 'clamp(13px, 0.9vw, 15px)', lineHeight: 1.5 }}
      >
        {copy.hero.sub}
      </p>

      <Button
        href={copy.hero.cta.href}
        className="anim-cta mt-[46px] h-[42px] w-[164px] text-[15px] max-md:w-full"
      >
        {copy.hero.cta.label}
      </Button>
    </div>
  )
}
