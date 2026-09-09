import { notFound } from 'next/navigation'
import { AdapterDetail } from '@/components/app/AdapterDetail'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

// `params` is a Promise in this version of Next.js and must be awaited.
export default async function AdapterPage({ params }: { params: Promise<{ symbol: string }> }) {
  const [{ symbol }, snapshot] = await Promise.all([params, readSnapshot()])
  const row = snapshot.rows.find((r) => r.symbol === symbol.toUpperCase())
  if (!row) notFound()

  return <AdapterDetail row={row} observedAt={snapshot.observedAt} />
}
