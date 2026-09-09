'use client'

import { useConnect, useConnectors } from 'wagmi'
import { Modal } from '@/components/ui/Modal'
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

  return (
    <Modal title={copy.app.wallet.modalTitle} onClose={onClose}>
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
    </Modal>
  )
}
