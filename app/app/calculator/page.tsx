import { Calculator } from '@/components/app/Calculator'
import { copy } from '@/content/copy.en'
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

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
        {copy.app.calculator.heading}
      </h1>
      <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{copy.app.calculator.lede}</p>

      <div className="mt-12">
        <Calculator rows={snapshot.rows} initialSymbol={asset} />
      </div>

      <p className="mt-10 text-[12px] text-fg-faint">{copy.footer.sourceNote}</p>
    </div>
  )
}
