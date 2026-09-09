'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useConnect, useConnectors } from 'wagmi'
import { useMounted } from '@/components/wallet/useMounted'
import { copy } from '@/content/copy.en'
import { pickWallets } from '@/lib/connectors'

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const mounted = useMounted()
  const connect = useConnect()
  const connectors = useConnectors()
  // Safe only works when the page is embedded in the Safe app. Checking the
  // frame here keeps pickWallets pure and testable.
  const inIframe = mounted && window.self !== window.top
  // wagmi always carries the generic injected connector, injected or not. Ask
  // the browser whether anything actually did, so we never render a dead row.
  const hasInjectedProvider = mounted && 'ethereum' in window
  const wallets = pickWallets(connectors, { inIframe, hasInjectedProvider })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // Hold the page still underneath, so dismissing the dialog returns the
    // reader to where they were rather than somewhere they scrolled to.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  if (!mounted) return null

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.app.wallet.modalTitle}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-3rem)] w-full max-w-[380px] overflow-y-auto rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 shadow-[0_24px_60px_rgba(0,0,0,.55)]"
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

  // Rendered into <body>, not in place. The console navbar carries
  // `backdrop-blur`, and a backdrop-filter makes its element the containing
  // block for fixed-position descendants — which pinned this dialog inside the
  // 64px header instead of the viewport, pushing it off screen.
  return createPortal(dialog, document.body)
}
