/**
 * Brief §11.3: label 12px, value 33px, then a bar or a delta.
 * `delta` is the only place colour is allowed outside the hero object, and only
 * on the digits themselves.
 */
export function StatNumber({
  label,
  value,
  source,
  fraction,
  delta,
  note,
}: {
  label: string
  value: string
  source?: string
  /** 0..1 — renders a progress bar when supplied. */
  fraction?: number
  /** Signed, already formatted, e.g. "+3.42%" — the sign drives the colour. */
  delta?: string
  note?: string
}) {
  const rising = delta?.startsWith('+')
  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
      <p className="text-[12px] text-fg-faint">{label}</p>
      <p className="mt-2 font-mono text-[33px] leading-none tabular-nums">{value}</p>

      {typeof fraction === 'number' && (
        <div className="mt-4 h-[3px] w-full rounded-[var(--radius-pill)] bg-white/[0.06]">
          <div
            className="h-full rounded-[var(--radius-pill)] bg-white/60"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }}
          />
        </div>
      )}

      {delta && (
        <p className={`mt-4 font-mono text-[13px] tabular-nums ${rising ? 'text-up' : 'text-down'}`}>
          {delta}
        </p>
      )}

      {source && <p className="mt-4 text-[12px] text-fg-faint">{source}</p>}
      {note && <p className="mt-2 text-[12px] text-fg-faint">{note}</p>}
    </div>
  )
}

/** A value the adapter would provide but cannot yet. Never a zero. */
export function StatUnavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
      <p className="text-[12px] text-fg-faint">{label}</p>
      <p className="mt-2 text-[15px] text-fg-muted">{reason}</p>
    </div>
  )
}
