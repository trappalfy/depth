export type ButtonVariant = 'primary' | 'secondary' | 'text'

export const buttonBase = 'inline-flex items-center justify-center transition-colors duration-[160ms]'

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'rounded-[var(--radius-pill)] bg-white text-ink-900 hover:bg-[#EDEDED] active:scale-[.985] font-semibold',
  secondary:
    'rounded-[var(--radius-pill)] bg-white/[0.06] text-white hover:bg-white/[0.10] font-semibold',
  text: 'text-white underline decoration-white/25 hover:decoration-white underline-offset-4',
}
