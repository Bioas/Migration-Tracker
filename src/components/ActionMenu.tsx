import { useEffect, useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { IconMore } from './Icons'

export interface MenuAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
}

export default function ActionMenu({
  items,
  ariaLabel = 'ตัวเลือก',
  buttonClassName,
  icon: Icon = IconMore,
  label,
}: {
  items: MenuAction[]
  ariaLabel?: string
  buttonClassName?: string
  icon?: typeof IconMore
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) })
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const toggle = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!open) place()
    setOpen((o) => !o)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={
          buttonClassName ??
          'w-8 h-8 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors'
        }
      >
        <Icon width={18} height={18} />
        {label ? <span className="hidden sm:inline">{label}</span> : null}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-[200] min-w-[9rem] rounded-xl bg-white ring-1 ring-ink-200 shadow-card-hover p-1 animate-scale-in"
          >
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(false)
                  item.onClick()
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                  item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink-700 hover:bg-ink-100'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
