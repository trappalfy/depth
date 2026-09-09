import { copy } from '@/content/copy.en'

/**
 * The pre-deployment state, said once and quietly.
 *
 * It replaces the panel that used to sit at the top of both console screens.
 * The screens now show the finished product with everything the live feeds can
 * answer already filled in, so a paragraph of apology at the top would describe
 * a page that no longer exists — while the reader still has to be told, exactly
 * once, that no contract is answering yet.
 */
export function PreviewBadge() {
  return (
    <span
      title={copy.app.preview.explain}
      className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-glass-border)] bg-ink-700 px-3 py-1 text-[12px] text-fg-muted"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
      {copy.app.preview.badge}
    </span>
  )
}

/**
 * Marks a single value as computed from the live feed by the adapter's own
 * rules, rather than read from a contract. On the card it sits beside the
 * label, so no number on the page can be mistaken for an on-chain read.
 */
export function PreviewMark() {
  return (
    <span className="rounded-[6px] border border-[var(--color-glass-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-fg-faint">
      {copy.app.preview.mark}
    </span>
  )
}
