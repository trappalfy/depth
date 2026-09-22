'use client'

import { useState } from 'react'
import { ActionButton } from '@/components/ui/ActionButton'
import { copy } from '@/content/copy.en'

/**
 * The address, whole and copyable.
 *
 * It is never truncated. A token address is the one string on this site where
 * a shortened form is actively dangerous — `0x1234…5678` is exactly what an
 * impostor address is built to match — so the full forty-two characters are on
 * the page, in mono, and they wrap rather than scroll on a phone.
 */
export function TokenAddress({ address, explorer }: { address: string; explorer: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
      <p className="text-[13px] uppercase tracking-[0.08em] text-fg-faint">
        {copy.token.address.heading}
      </p>

      <p className="mt-4 break-all font-mono text-[19px] leading-relaxed max-md:text-[15px]">
        {address}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ActionButton
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(address).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            })
          }}
          className="h-[34px] px-4 text-[13px]"
        >
          {copied ? copy.token.address.copied : copy.token.address.copy}
        </ActionButton>

        <a
          href={`${explorer}/address/${address}`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[15px] text-fg-muted underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white"
        >
          {copy.token.address.explorer}
        </a>
      </div>
    </div>
  )
}
