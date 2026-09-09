import Link from 'next/link'
import { copy } from '@/content/copy.en'

/**
 * Brief §11.8: ink-900, 120px top padding, wordmark, three to four link
 * columns, and a bottom line carrying the copyright and the source note.
 * No social tiles and no newsletter form — the brief forbids both here.
 */
export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-ink-900 pb-16 pt-[120px] max-md:pt-16">
      <div className="mx-auto max-w-[1132px] px-6">
        <div className="flex gap-16 max-md:flex-col max-md:gap-10">
          <div className="min-w-[180px]">
            <Link href="/" className="text-[20px] font-semibold tracking-[0.02em] text-white">
              {copy.brand}
            </Link>
          </div>

          <div className="grid flex-1 gap-10 sm:grid-cols-3">
            {copy.footer.columns.map((column) => (
              <div key={column.title}>
                <p className="text-[12px] text-fg-faint">{column.title}</p>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => {
                    const external = 'external' in link && link.external
                    return (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          target={external ? '_blank' : undefined}
                          rel={external ? 'noreferrer' : undefined}
                          className="text-[15px] text-fg-muted transition-colors duration-[160ms] hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

            <div>
              <p className="text-[12px] text-fg-faint">Contact</p>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href={`mailto:${copy.contactEmail}`}
                    className="text-[15px] text-fg-muted transition-colors duration-[160ms] hover:text-white"
                  >
                    {copy.contactEmail}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-white/[0.06] pt-8">
          <p className="text-[12px] text-fg-faint">
            © {year} {copy.brand}. {copy.footer.rights}
          </p>
          <p className="mt-2 max-w-[80ch] text-[12px] text-fg-faint">{copy.footer.sourceNote}</p>
        </div>
      </div>
    </footer>
  )
}
