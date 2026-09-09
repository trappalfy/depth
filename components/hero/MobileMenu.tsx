'use client'

import Link from 'next/link'
import { useState } from 'react'
import { copy } from '@/content/copy.en'

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[var(--radius-pill)] bg-white/[0.06]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path
            d={open ? 'M3 3l10 10M13 3L3 13' : 'M2 5h12M2 11h12'}
            stroke="white"
            strokeWidth="1.4"
            fill="none"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-4 top-[70px] rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-3 shadow-[0_24px_60px_rgba(0,0,0,.55)]">
          {copy.nav.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-[10px] px-3 py-2.5 text-[16px] text-fg-muted hover:bg-ink-600 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={copy.nav.secondary.href}
            onClick={() => setOpen(false)}
            className="block rounded-[10px] px-3 py-2.5 text-[16px] text-fg-muted hover:bg-ink-600 hover:text-white"
          >
            {copy.nav.secondary.label}
          </Link>
          <Link
            href={copy.nav.primary.href}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-[var(--radius-pill)] bg-white px-3 py-2.5 text-center text-[16px] font-semibold text-ink-900"
          >
            {copy.nav.primary.label}
          </Link>
        </div>
      )}
    </div>
  )
}
