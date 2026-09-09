import { Calculator } from '@/components/app/Calculator'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

// Reading `?asset=` from the server prop rather than useSearchParams keeps the
// page out of a Suspense boundary and off a client-only render path.
export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>
}) {
  const [{ asset }, snapshot] = await Promise.all([searchParams, readSnapshot()])
  return <Calculator snapshot={snapshot} initialSymbol={asset} />
}
