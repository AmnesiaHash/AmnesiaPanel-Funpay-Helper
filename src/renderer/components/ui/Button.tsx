import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  children: ReactNode
}

/** Primary action button with glass styling. */
export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  )
}
