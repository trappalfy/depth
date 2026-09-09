import Link from 'next/link'
import { BoardTable } from '@/components/board/BoardTable'
import { copy } from '@/content/copy.en'
import { readSnapshot } from '@/lib/snapshot'
import { STATUS_NOTE, type Status } from '@/lib/status'

export const revalidate = 30

export default async function BoardPage() {
  const snapshot = await readSnapshot()
  const statuses: Status[] = ['NORMAL', 'OFF_HOURS', 'CORPORATE_ACTION', 'TOKEN_HALTED', 'STALE']

  return (
    <main className="min-h-screen bg-ink-800 py-24">
      <div className="mx-auto max-w-[1132px] px-6">
        <Link href="/" className="text-[15px] text-fg-muted hover:text-white">
          {copy.brand}
        </Link>

        <h1 className="mt-10 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
          Live feed status
        </h1>
        <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">
          Every covered ticker on Robinhood Chain, classified the way the adapter would classify
          it. The adapter is not deployed yet — this page runs the same rules off-chain against
          live data.
        </p>
        <p className="mt-6">
          <Link
            href="/app"
            className="text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
          >
            {copy.app.entry.fromBoard}
          </Link>
        </p>

        <div className="mt-14">
          <BoardTable initial={snapshot} />
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {statuses.map((s) => (
            <div
              key={s}
              className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-5"
            >
              <p className="text-[15px] font-semibold">{s}</p>
              <p className="mt-2 text-[15px] text-fg-muted">{STATUS_NOTE[s]}</p>
            </div>
          ))}
        </div>

        <p className="mt-16 text-[12px] text-fg-faint">{copy.footer.sourceNote}</p>
      </div>
    </main>
  )
}
