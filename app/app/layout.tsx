import type { Metadata } from 'next'
import { AppNav } from '@/components/app/AppNav'
import { WalletProvider } from '@/components/wallet/WalletProvider'

export const metadata: Metadata = {
  // A default plus its own template: without the template, the pages nested
  // under this layout lose the suffix and a tab reads just 'Calculator'.
  title: { default: 'Console', template: '%s · Depth' },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-ink-800">
        <AppNav />
        <main className="mx-auto max-w-[1132px] px-6 pb-32 pt-[112px]">{children}</main>
      </div>
    </WalletProvider>
  )
}
