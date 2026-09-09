import { STATUS_LABEL, type Status } from '@/lib/status'

const tone: Record<Status, string> = {
  NORMAL: 'bg-white/[0.06] text-white',
  OFF_HOURS: 'bg-white/[0.06] text-fg-muted',
  CORPORATE_ACTION: 'bg-white/[0.10] text-white',
  TOKEN_HALTED: 'bg-white/[0.10] text-white',
  STALE: 'bg-white/[0.10] text-white',
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-1 text-[12px] ${tone[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
