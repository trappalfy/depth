import { HeroObject } from '@/components/hero/HeroObject'

/**
 * Brief §11.5, the first of the object's two permitted reappearances: a narrow
 * band showing only the lit edge — gold highlight and cobalt — with the rest of
 * the silhouette cropped away. Once is an event; three times is wallpaper, so
 * this is the only full appearance outside the hero.
 *
 * Hidden below md: a second WebGL context is not worth a phone's battery, and
 * at that width the crop has no room to read as an edge.
 */
export function MotifBand() {
  return (
    <div
      aria-hidden
      className="relative h-[140px] overflow-hidden bg-ink-800 max-md:hidden"
    >
      <HeroObject
        className="pointer-events-none absolute left-[6%] h-[380px] w-[520px]"
        style={{ top: '-232px' }}
      />
    </div>
  )
}
