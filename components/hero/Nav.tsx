'use client'

import Link from 'next/link'
import { useState } from 'react'
import { copy } from '@/content/copy.en'
import { Button } from '@/components/ui/Button'

export function Nav() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <nav className="anim-nav absolute inset-x-0 top-0 z-30 h-[86px]">
      <div className="mx-auto flex h-full max-w-[1132px] items-center justify-between px-6">
        <Link
          href="/"
          className="text-[20px] font-semibold tracking-[0.02em] text-white"
        >
          {copy.brand}
        </Link>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
          {copy.nav.items.map((item) => {
            const children = 'children' in item ? item.children : undefined
            return (
              <li
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpen(children ? item.label : null)}
                onMouseLeave={() => setOpen(null)}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-[16px] text-fg-muted transition-colors duration-[160ms] hover:text-white"
                >
                  {item.label}
                  {children && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      aria-hidden
                      className={`transition-transform duration-[180ms] ${
                        open === item.label ? 'rotate-180' : ''
                      }`}
                    >
                      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    </svg>
                  )}
                </Link>

                {children && open === item.label && (
                  <div className="absolute left-0 top-full w-56 translate-y-1.5 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-2 shadow-[0_24px_60px_rgba(0,0,0,.55)]">
                    {children.map((child) => {
                      const external = 'external' in child && child.external
                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          target={external ? '_blank' : undefined}
                          rel={external ? 'noreferrer' : undefined}
                          className="block rounded-[10px] px-3 py-2 text-[15px] text-fg-muted transition-colors hover:bg-ink-600 hover:text-white"
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Button
            href={copy.nav.secondary.href}
            variant="secondary"
            className="h-[38px] px-4 text-[15px]"
          >
            {copy.nav.secondary.label}
          </Button>
          <Button href={copy.nav.primary.href} className="h-[38px] px-4 text-[15px]">
            {copy.nav.primary.label}
          </Button>
        </div>
      </div>
    </nav>
  )
}
