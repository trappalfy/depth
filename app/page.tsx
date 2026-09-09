import { Backdrop } from '@/components/hero/Backdrop'
import { HeroObject } from '@/components/hero/HeroObject'

export default function Page() {
  return (
    <main className="relative h-[100svh] w-full overflow-hidden">
      <Backdrop />
      <HeroObject />
    </main>
  )
}
