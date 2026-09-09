export function Card({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 transition-colors duration-[160ms] hover:border-white/[0.14] hover:bg-ink-600 ${className}`}
    >
      {children}
    </div>
  )
}
