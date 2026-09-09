'use client'

import { useState } from 'react'
import type { Address } from 'viem'
import { ActionButton } from '@/components/ui/ActionButton'
import { copy } from '@/content/copy.en'

export function IntegrationSnippet({ feed, adapter }: { feed: Address; adapter: Address | null }) {
  const [copied, setCopied] = useState(false)

  const adapterLine = adapter ?? `<${copy.app.list.addressPending}>`
  const snippet = [
    '// Before — the raw Chainlink feed',
    `AggregatorV3Interface oracle = AggregatorV3Interface(${feed});`,
    '',
    '// After — one governance change, no code change',
    `AggregatorV3Interface oracle = AggregatorV3Interface(${adapterLine});`,
  ].join('\n')

  return (
    <section>
      <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{copy.app.snippet.heading}</h2>
      <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{copy.app.snippet.lede}</p>

      <div className="mt-6 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700">
        <div className="flex items-center justify-end border-b border-white/[0.06] px-4 py-2">
          <ActionButton
            variant="secondary"
            disabled={adapter === null}
            title={adapter === null ? copy.app.blocked.notDeployed : undefined}
            onClick={() => {
              navigator.clipboard.writeText(snippet).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              })
            }}
            className="h-[30px] px-3 text-[13px]"
          >
            {copied ? copy.app.snippet.copied : copy.app.snippet.copy}
          </ActionButton>
        </div>
        <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </div>

      <h3 className="mt-10 text-[17px] font-semibold">{copy.app.snippet.gateHeading}</h3>
      <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{copy.app.snippet.gateNote}</p>
      <pre className="mt-4 overflow-x-auto rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 font-mono text-[13px] leading-relaxed">
        <code>{copy.app.snippet.gateCode}</code>
      </pre>
    </section>
  )
}
