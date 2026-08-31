import { useEffect, type ReactNode } from 'react'
import { IconX } from './Icons'

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  wide,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  wide?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} bg-white rounded-t-2xl sm:rounded-2xl ring-1 ring-ink-200 shadow-card-hover animate-fade-up max-h-[92vh] overflow-y-auto scrollbar-thin`}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div>
            <h3 className="font-bold text-ink-900">{title}</h3>
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="shrink-0 w-8 h-8 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
          >
            <IconX width={18} height={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
