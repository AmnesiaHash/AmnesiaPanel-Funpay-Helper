import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}

/** Animated modal dialog. */
export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`glass-card max-h-[90vh] w-full overflow-auto ${wide ? 'max-w-5xl' : 'max-w-lg'}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
