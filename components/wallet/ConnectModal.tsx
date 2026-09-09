'use client'

import { useEffect } from 'react'
import { useConnect, useConnectors } from 'wagmi'
import { copy } from '@/content/copy.en'
import { pickWallets } from '@/lib/connectors'

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const connect = useConnect()
  const connectors = useConnectors()
  const wallets = pickWallets(connectors)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.app.wallet.modalTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 shadow-[0_24px_60px_rgba(0,0,0,.55)]"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-[17px] font-semibold">{copy.app.wallet.modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.app.wallet.close}
            className="text-fg-faint transition-colors hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="mt-5">
            <p className="text-[15px] text-fg-muted">{copy.app.wallet.none}</p>
            <a
              href={copy.app.wallet.noneHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
            >
              {copy.app.wallet.noneCta}
            </a>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {wallets.map((wallet) => (
              <li key={wallet.id}>
                <button
                  type="button"
                  disabled={connect.isPending}
                  onClick={() => {
                    const connector = connectors.find((c) => c.id === wallet.id)
                    if (!connector) return
                    connect.mutate({ connector }, { onSuccess: onClose })
                  }}
                  className="flex w-full items-center gap-3 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-800 px-4 py-3 text-left text-[15px] transition-colors duration-[160ms] hover:border-white/[0.14] hover:bg-ink-600 disabled:opacity-40"
                >
                  {wallet.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wallet.icon} alt="" width={20} height={20} className="rounded-[4px]" />
                  ) : (
                    <span className="h-5 w-5 rounded-[4px] bg-white/[0.10]" />
                  )}
                  {wallet.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-[12px] text-fg-faint">{copy.app.wallet.modalNote}</p>
      </div>
    </div>
  )
}
