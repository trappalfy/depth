import type { Metadata } from 'next'
import Link from 'next/link'
import { createPublicClient, erc20Abi, formatUnits, http } from 'viem'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { TokenAddress } from '@/components/token/TokenAddress'
import { copy } from '@/content/copy.en'
import { TOKEN, type TokenLaunch } from '@/lib/token'

export const metadata: Metadata = {
  title: 'Token',
  description:
    'The Depth token contract address, read from the chain. The only place Depth publishes it.',
}

export const revalidate = 30

type Reading =
  | { kind: 'unlaunched' }
  | { kind: 'unreadable'; launch: TokenLaunch }
  | {
      kind: 'live'
      launch: TokenLaunch
      symbol: string
      decimals: number
      supply: bigint
      blockNumber: bigint
      readAt: number
    }

/**
 * The contract's own account of itself. Nothing here is a constant we keep: if
 * the chain cannot be read, the page says so rather than falling back to a
 * number somebody typed once.
 */
async function read(): Promise<Reading> {
  if (!TOKEN) return { kind: 'unlaunched' }

  try {
    const client = createPublicClient({ transport: http(TOKEN.rpcUrl, { batch: true }) })
    const token = { address: TOKEN.address, abi: erc20Abi } as const
    const [symbol, decimals, supply, blockNumber] = await Promise.all([
      client.readContract({ ...token, functionName: 'symbol' }),
      client.readContract({ ...token, functionName: 'decimals' }),
      client.readContract({ ...token, functionName: 'totalSupply' }),
      client.getBlockNumber(),
    ])
    return {
      kind: 'live',
      launch: TOKEN,
      symbol,
      decimals,
      supply,
      blockNumber,
      readAt: Math.floor(Date.now() / 1000),
    }
  } catch {
    return { kind: 'unreadable', launch: TOKEN }
  }
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-5">
      <p className="text-[13px] uppercase tracking-[0.08em] text-fg-faint">{label}</p>
      <p className="mt-3 font-mono text-[22px] leading-none">{value}</p>
      {note ? <p className="mt-3 text-[13px] text-fg-faint">{note}</p> : null}
    </div>
  )
}

export default async function TokenPage() {
  const reading = await read()
  const t = copy.token
  const pendingNote = reading.kind === 'live' ? undefined : t.facts.pendingNote

  return (
    <>
      <main className="min-h-screen bg-ink-800 py-24">
        <div className="mx-auto max-w-[1132px] px-6">
          <Link href="/" className="text-[15px] text-fg-muted hover:text-white">
            {copy.brand}
          </Link>

          <h1 className="mt-10 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
            {t.heading}
          </h1>
          <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{t.lede}</p>

          <div className="mt-14">
            {reading.kind === 'live' ? (
              <TokenAddress address={reading.launch.address} explorer={reading.launch.explorer} />
            ) : (
              <div className="rounded-[14px] border border-dashed border-white/15 bg-ink-700/40 p-6">
                <p className="text-[13px] uppercase tracking-[0.08em] text-fg-faint">
                  {t.address.heading}
                </p>
                <p className="mt-4 font-mono text-[19px] text-fg-faint max-md:text-[15px]">
                  {t.address.pending}
                </p>
                <p className="mt-4 max-w-[68ch] text-[15px] text-fg-muted">
                  {reading.kind === 'unreadable' ? t.facts.unreadable : t.address.pendingNote}
                </p>
                <p className="mt-4 max-w-[68ch] text-[15px] text-fg-muted">
                  {t.address.announce.before}
                  <a
                    href={t.address.announce.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
                  >
                    {t.address.announce.handle}
                  </a>
                  {t.address.announce.after}
                </p>
              </div>
            )}
          </div>

          <section className="mt-16">
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{t.facts.heading}</h2>
            <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{t.facts.lede}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Fact
                label={t.facts.network}
                value={reading.kind === 'live' ? reading.launch.chainName : t.facts.pending}
                note={
                  reading.kind === 'live'
                    ? `chain ${reading.launch.chainId}`
                    : pendingNote
                }
              />
              <Fact
                label={t.facts.symbol}
                value={reading.kind === 'live' ? reading.symbol : t.facts.pending}
                note={pendingNote}
              />
              <Fact
                label={t.facts.supply}
                value={
                  reading.kind === 'live'
                    ? Number(formatUnits(reading.supply, reading.decimals)).toLocaleString('en-US')
                    : t.facts.pending
                }
                note={
                  reading.kind === 'live'
                    ? `read at block ${reading.blockNumber.toString()}`
                    : pendingNote
                }
              />
              <Fact
                label={t.facts.decimals}
                value={reading.kind === 'live' ? String(reading.decimals) : t.facts.pending}
                note={
                  reading.kind === 'live'
                    ? `${t.facts.launchedAt} ${reading.launch.launchedAtBlock.toString()}`
                    : pendingNote
                }
              />
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{t.verify.heading}</h2>
            <ul className="mt-6 grid gap-4">
              {t.verify.points.map((point) => (
                <li
                  key={point}
                  className="max-w-[80ch] rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-5 text-[15px] text-fg-muted"
                >
                  {point}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
