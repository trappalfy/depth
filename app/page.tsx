import { Hero } from '@/components/hero/Hero'
import { Contact } from '@/components/sections/Contact'
import { ConventionMatrix } from '@/components/sections/ConventionMatrix'
import { Integration } from '@/components/sections/Integration'
import { Limits } from '@/components/sections/Limits'
import { Mechanism } from '@/components/sections/Mechanism'
import { Problem } from '@/components/sections/Problem'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

export default async function Page() {
  const snapshot = await readSnapshot()

  return (
    <main>
      <Hero snapshot={snapshot} />
      <Problem snapshot={snapshot} />
      <ConventionMatrix />
      <Mechanism />
      <Integration />
      <Limits />
      <Contact />
    </main>
  )
}
