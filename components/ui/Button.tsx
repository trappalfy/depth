import Link from 'next/link'
import { buttonBase, buttonVariants, type ButtonVariant } from '@/components/ui/buttonStyles'

export function Button({
  href,
  variant = 'primary',
  className = '',
  children,
}: {
  href: string
  variant?: ButtonVariant
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariants[variant]} ${className}`}>
      {children}
    </Link>
  )
}
