import { Backdrop } from '@/components/hero/Backdrop'
import { GlassCards } from '@/components/hero/GlassCards'
import { HeroCopy } from '@/components/hero/HeroCopy'
import { HeroObject } from '@/components/hero/HeroObject'
import { Nav } from '@/components/hero/Nav'
import type { Snapshot } from '@/lib/snapshot'

export function Hero({ snapshot }: { snapshot: Snapshot }) {
  const tsla = snapshot.rows.find((r) => r.symbol === 'TSLA')

  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <Backdrop />
      <div className="anim-obj absolute inset-0">
        <HeroObject />
      </div>
      <GlassCards tsla={tsla} observedAt={snapshot.observedAt} />
      <Nav />
      <div className="absolute inset-x-0 z-20" style={{ top: '16.8%' }}>
        <HeroCopy />
      </div>
    </section>
  )
}
