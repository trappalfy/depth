'use client'

import { buttonBase, buttonVariants, type ButtonVariant } from '@/components/ui/buttonStyles'

export function ActionButton({
  variant = 'primary',
  disabled = false,
  title,
  onClick,
  className = '',
  children,
}: {
  variant?: ButtonVariant
  disabled?: boolean
  /** Native tooltip carrying the reason a disabled button is disabled. */
  title?: string
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${buttonBase} ${buttonVariants[variant]} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}
