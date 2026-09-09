import Link from 'next/link'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { copy } from '@/content/copy.en'

const INTERFACE = `interface IStockOracleAdapter is AggregatorV3Interface {
  enum Status { NORMAL, OFF_HOURS, CORPORATE_ACTION, DESYNC, TOKEN_HALTED, SEQUENCER_DOWN, UNSAFE }

  function status()     external view returns (Status);
  function observedAt() external view returns (uint256);
  function valueOf(uint256 rawAmount)  external view returns (uint256);
  function valueOfUI(uint256 uiAmount) external view returns (uint256);
  function commit() external;
  function token() external view returns (address);
  function feed()  external view returns (address);
}`

export default function DocsPage() {
  return (
    <>
    <main className="min-h-screen bg-ink-800 py-24">
      <div className="mx-auto max-w-[1132px] px-6">
        <Link href="/" className="text-[15px] text-fg-muted hover:text-white">
          {copy.brand}
        </Link>

        <h1 className="mt-10 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
          Integration
        </h1>

        <div className="mt-14 max-w-[68ch] space-y-10">
          <section>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Status of this work</h2>
            <p className="mt-3 text-[15px] text-fg-muted">
              The adapter contracts are not deployed. This page documents the interface they will
              expose; the live board already runs the classification rules against mainnet data.
            </p>
            <p className="mt-4">
              <Link
                href="/app"
                className="text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
              >
                {copy.app.entry.fromDocs}
              </Link>
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">The interface</h2>
            <pre className="mt-4 overflow-x-auto rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 font-mono text-[13px] leading-relaxed">
              <code>{INTERFACE}</code>
            </pre>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
              updatedAt means something different
            </h2>
            <p className="mt-3 text-[15px] text-fg-muted">
              Inside a protection window the adapter returns the current time in{' '}
              <span className="font-mono">updatedAt</span>, redefined as the moment the adapter
              confirmed the value is safe to use. Returning the underlying round time would trip
              your own staleness check and freeze your market, which is the failure the adapter
              exists to prevent. The honest market observation time is always available separately
              from <span className="font-mono">observedAt()</span>, and the reason is in{' '}
              <span className="font-mono">status()</span>.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
              Optional: gate new borrows
            </h2>
            <p className="mt-3 text-[15px] text-fg-muted">
              Liquidation protection needs no code change. Preventing new risk from being taken on
              a held price does, and it is three lines.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 font-mono text-[13px] leading-relaxed">
              <code>{copy.app.snippet.gateCode}</code>
            </pre>
          </section>

          <section id="contact">
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Contact</h2>
            <p className="mt-3 text-[15px] text-fg-muted">
              <a
                className="underline decoration-white/25 underline-offset-4 hover:decoration-white"
                href={`mailto:${copy.contactEmail}`}
              >
                {copy.contactEmail}
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
      <SiteFooter />
    </>
  )
}
