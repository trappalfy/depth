'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMounted } from '@/components/wallet/useMounted'
import { copy } from '@/content/copy.en'

/**
 * The dialog shell both console modals share: Escape, a click outside, a held
 * page underneath, and a portal into <body>.
 *
 * The portal is not a detail. The console navbar carries `backdrop-blur`, and a
 * backdrop-filter makes its element the containing block for fixed-position
 * descendants — which once pinned a dialog inside the 64px header and pushed it
 * off screen entirely.
 */
export function Modal({
  title,
  onClose,
  widthClassName = 'max-w-[380px]',
  children,
}: {
  title: string
  onClose: () => void
  widthClassName?: string
  children: React.ReactNode
}) {
  const mounted = useMounted()

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
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[calc(100dvh-3rem)] w-full ${widthClassName} overflow-y-auto rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 shadow-[0_24px_60px_rgba(0,0,0,.55)]`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.app.wallet.close}
            className="shrink-0 text-fg-faint transition-colors hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
