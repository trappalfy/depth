'use client'

import Link from 'next/link'
import { useState } from 'react'
import { copy } from '@/content/copy.en'

const rowClass =
  'block rounded-[10px] px-3 py-2.5 text-[16px] text-fg-muted hover:bg-ink-600 hover:text-white'

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

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
          {/* There is no hover on a phone, so a menu's children are listed
              inline underneath it. Before, only the top level rendered, which
              left every Resources link unreachable on mobile entirely. */}
          {copy.nav.items.map((item) => {
            const children = 'children' in item ? item.children : undefined
            const href = 'href' in item ? item.href : undefined

            if (!children) {
              return (
                <Link key={item.label} href={href ?? '/'} onClick={close} className={rowClass}>
                  {item.label}
                </Link>
              )
            }

            return (
              <div key={item.label}>
                {href === undefined ? (
                  <p className="px-3 pb-1 pt-3 text-[12px] text-fg-faint">{item.label}</p>
                ) : (
                  <Link href={href} onClick={close} className={rowClass}>
                    {item.label}
                  </Link>
                )}
                {children.map((child) => {
                  const external = 'external' in child && child.external
                  return (
                    <Link
                      key={child.label}
                      href={child.href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noreferrer' : undefined}
                      onClick={close}
                      className="block rounded-[10px] py-2 pl-6 pr-3 text-[15px] text-fg-muted hover:bg-ink-600 hover:text-white"
                    >
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}

          {/* No separate Documentation row: now that the menus expand, it is
              already here as the first Resources link. */}
          <Link
            href={copy.nav.primary.href}
            onClick={close}
            className="mt-1 block rounded-[var(--radius-pill)] bg-white px-3 py-2.5 text-center text-[16px] font-semibold text-ink-900"
          >
            {copy.nav.primary.label}
          </Link>
        </div>
      )}
    </div>
  )
}
