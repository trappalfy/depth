export function formatAge(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 60) return 'just now'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) {
    const rem = m % 60
    return `${h}h ${rem}m`
  }
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

export function formatPrice(answer: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals)
  // Round to cents rather than truncate: 364.78665 must read 364.79, not 364.78.
  const cents = (answer * 100n + divisor / 2n) / divisor
  const whole = cents / 100n
  const frac = cents % 100n
  return `${whole}.${frac.toString().padStart(2, '0')}`
}

export function formatMultiplier(raw: bigint): string {
  const divisor = 10n ** 18n
  const whole = raw / divisor
  const frac = ((raw % divisor) * 1_000_000n) / divisor
  return `${whole}.${frac.toString().padStart(6, '0')}`
}

export function heartbeatFraction(ageSeconds: number, heartbeatSeconds: number): number {
  if (heartbeatSeconds <= 0) return 1
  const f = ageSeconds / heartbeatSeconds
  if (!Number.isFinite(f) || f < 0) return 0
  return f > 1 ? 1 : f
}

export function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}
