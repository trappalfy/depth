import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'text'

const base = 'inline-flex items-center justify-center transition-colors duration-[160ms]'

const styles: Record<Variant, string> = {
  primary:
    'rounded-[var(--radius-pill)] bg-white text-ink-900 hover:bg-[#EDEDED] active:scale-[.985] font-semibold',
  secondary:
    'rounded-[var(--radius-pill)] bg-white/[0.06] text-white hover:bg-white/[0.10] font-semibold',
  text: 'text-white underline decoration-white/25 hover:decoration-white underline-offset-4',
}

export function Button({
  href,
  variant = 'primary',
  className = '',
  children,
}: {
  href: string
  variant?: Variant
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  )
}
