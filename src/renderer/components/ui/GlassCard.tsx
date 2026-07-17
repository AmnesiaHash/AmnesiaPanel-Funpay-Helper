import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  title?: string
}

/** Glassmorphism card container. */
export function GlassCard({ children, className = '', title }: GlassCardProps) {
  return (
    <div className={`glass-card p-6 animate-fade-in ${className}`}>
      {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </div>
  )
}
