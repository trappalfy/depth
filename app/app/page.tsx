import { AdapterList } from '@/components/app/AdapterList'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

export default async function AppPage() {
  const snapshot = await readSnapshot()
  return <AdapterList initial={snapshot} />
}
