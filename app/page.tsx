import { Hero } from '@/components/hero/Hero'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

export default async function Page() {
  const snapshot = await readSnapshot()

  return (
    <main>
      <Hero snapshot={snapshot} />
    </main>
  )
}
