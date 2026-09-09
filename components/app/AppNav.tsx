import Link from 'next/link'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { Wordmark } from '@/components/ui/Wordmark'
import { copy } from '@/content/copy.en'

export function AppNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--color-glass-border)] bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex h-[64px] max-w-[1132px] items-center gap-8 px-6">
        <Wordmark markClassName="h-[19px]" textClassName="text-[17px]" />

        <nav className="flex items-center gap-6 max-md:hidden">
          {copy.app.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[15px] text-fg-muted transition-colors duration-[160ms] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
