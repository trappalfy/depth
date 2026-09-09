'use client'

import Link from 'next/link'
import { useState } from 'react'
import { copy } from '@/content/copy.en'
import { Button } from '@/components/ui/Button'
import { Wordmark } from '@/components/ui/Wordmark'
import { MobileMenu } from '@/components/hero/MobileMenu'

const triggerClass =
  'flex items-center gap-1.5 whitespace-nowrap text-[16px] text-fg-muted transition-colors duration-[160ms] hover:text-white'

export function Nav() {
  const [open, setOpen] = useState<string | null>(null)

  /** Only close if this item is the one still showing, never someone else's. */
  const closeIf = (label: string) => setOpen((current) => (current === label ? null : current))

  return (
    <nav className="anim-nav absolute inset-x-0 top-0 z-30 h-[86px]">
      <div className="mx-auto flex h-full max-w-[1132px] items-center justify-between px-6">
        <Wordmark priority />

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
          {copy.nav.items.map((item, index) => {
            const children = 'children' in item ? item.children : undefined
            const href = 'href' in item ? item.href : undefined
            const isOpen = open === item.label
            // The last menu sits closest to the right edge; opening it leftwards
            // keeps a 224px panel inside the viewport at every desktop width.
            const alignRight = index === copy.nav.items.length - 1

            const label = (
              <>
                {item.label}
                {children && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    aria-hidden
                    className={`transition-transform duration-[180ms] ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  </svg>
                )}
              </>
            )

            return (
              <li
                key={item.label}
                className="relative"
                onMouseEnter={() => children && setOpen(item.label)}
                onMouseLeave={() => closeIf(item.label)}
                // focus and blur bubble here as focusin/focusout, so tabbing to
                // the trigger opens the menu and tabbing out of the item closes
                // it — moving between the trigger and its own links does not,
                // because the panel lives inside this <li>.
                onFocus={() => children && setOpen(item.label)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    closeIf(item.label)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setOpen(null)
                }}
              >
                {href === undefined ? (
                  // Opens, never toggles. Pointing at the trigger already
                  // opened the menu on hover, so a toggle would close it on the
                  // very click meant to use it. Leaving, Escape or tabbing away
                  // are what close it; the click is here for keyboards.
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(item.label)}
                    className={triggerClass}
                  >
                    {label}
                  </button>
                ) : (
                  <Link href={href} className={triggerClass}>
                    {label}
                  </Link>
                )}

                {children && isOpen && (
                  // The panel used to be pushed down by a transform, which left
                  // 6px of nothing between the trigger and the menu: the cursor
                  // crossed it, left the <li>, and the menu closed before it
                  // could be reached. That gap is now transparent padding
                  // INSIDE the hover area, so the whole path stays live.
                  <div
                    className={`absolute top-full w-56 pt-2 ${alignRight ? 'right-0' : 'left-0'}`}
                  >
                    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-2 shadow-[0_24px_60px_rgba(0,0,0,.55)]">
                      {children.map((child) => {
                        const external = 'external' in child && child.external
                        return (
                          <Link
                            key={child.label}
                            href={child.href}
                            target={external ? '_blank' : undefined}
                            rel={external ? 'noreferrer' : undefined}
                            onClick={() => setOpen(null)}
                            className="block rounded-[10px] px-3 py-2 text-[15px] text-fg-muted transition-colors hover:bg-ink-600 hover:text-white"
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <MobileMenu />

        {/* One button only. Brief §6.3: a heavier right block outweighs the
            wordmark and visually breaks the viewport-centred menu — with two
            buttons the centred menu and this block genuinely overlap at every
            width. Documentation moved into the Resources dropdown. */}
        <div className="flex items-center max-md:hidden">
          <Button
            href={copy.nav.primary.href}
            className="h-[38px] whitespace-nowrap px-4 text-[15px]"
          >
            {copy.nav.primary.label}
          </Button>
        </div>
      </div>
    </nav>
  )
}
