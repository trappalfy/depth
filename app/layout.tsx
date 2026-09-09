import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { copy } from '@/content/copy.en'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: `${copy.brand} — corporate action firewall for tokenized equities`,
  description:
    'A drop-in oracle adapter that keeps stock splits, oracle pauses and 24-hour heartbeats from liquidating healthy DeFi positions on Robinhood Chain.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-ink-800 text-fg font-sans antialiased">{children}</body>
    </html>
  )
}
