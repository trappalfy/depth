'use client'

import { useEffect, useState } from 'react'

/**
 * True only after the first client render. Wallet state cannot exist on the
 * server, so every component that branches on it renders its resting state
 * until this flips — otherwise the server and client disagree on first paint.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
