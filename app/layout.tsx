import type { Metadata } from 'next'
import { Archivo, Geist_Mono } from 'next/font/google'
import { copy } from '@/content/copy.en'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: {
    default: `${copy.brand}: corporate action firewall for tokenized equities`,
    // Every other page fills this in, so a row of open tabs stays legible.
    template: `%s · ${copy.brand}`,
  },
  description:
    'A drop-in oracle adapter that keeps stock splits, oracle pauses and 24-hour heartbeats from liquidating healthy DeFi positions on Robinhood Chain.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${geistMono.variable}`}>
      <body className="bg-ink-800 text-fg font-sans antialiased">{children}</body>
    </html>
  )
}
