import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconChevronDown } from './Icons'

export interface SelectOption {
  value: string
  label: string
  /** ข้อความรองท้ายบรรทัด เช่น ตำแหน่งของคนในทีม */
  hint?: string
}

/** ความสูงสูงสุดของกล่องตัวเลือก — เกินกว่านี้ให้เลื่อนแทนที่จะยาวจนล้นจอ */
const MAX_PANEL_HEIGHT = 288
const GAP = 6

type Placement = { left: number; width: number; top?: number; bottom?: number; maxHeight: number }

/**
 * dropdown ที่วาดเอง — ใช้แทน <select> เพราะรายการตัวเลือกของ native
 * ระบบปฏิบัติการเป็นคนวาด แต่งด้วย CSS ไม่ได้เลย (ขอบเหลี่ยม แถบไฮไลต์สีน้ำเงิน ฟอนต์คนละตัว)
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = '— ไม่ระบุ —',
  allowEmpty = false,
  disabled = false,
  ariaLabel,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** ข้อความตอนยังไม่ได้เลือก */
  placeholder?: string
  /** ให้มีตัวเลือก "ไม่ระบุ" สำหรับล้างค่า */
  allowEmpty?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
}) {
  const rows: SelectOption[] = allowEmpty ? [{ value: '', label: placeholder }, ...options] : options
  const selectedIndex = rows.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : null

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<Placement | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const typed = useRef({ text: '', at: 0 })
  const listId = useRef(`select-${Math.random().toString(36).slice(2, 8)}`).current

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - GAP - 8
    const above = r.top - GAP - 8
    // เปิดขึ้นบนเมื่อที่ข้างล่างเหลือน้อยกว่าที่ข้างบนจริง ๆ เท่านั้น
    const useAbove = below < 180 && above > below
    setPos({
      left: r.left,
      width: r.width,
      top: useAbove ? undefined : r.bottom + GAP,
      bottom: useAbove ? window.innerHeight - r.top + GAP : undefined,
      maxHeight: Math.max(120, Math.min(MAX_PANEL_HEIGHT, useAbove ? above : below)),
    })
  }

  const openPanel = () => {
    if (disabled) return
    place()
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  const choose = (index: number) => {
    const row = rows[index]
    if (!row) return
    onChange(row.value)
    setOpen(false)
    btnRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    rowRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openPanel()
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(rows.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(rows.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(active)
        break
      default:
        // พิมพ์ตัวอักษรเพื่อกระโดดไปตัวเลือกที่ขึ้นต้นตรงกัน — native select ทำได้ ของเราต้องทำเอง
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now()
          typed.current = {
            text: now - typed.current.at > 800 ? e.key : typed.current.text + e.key,
            at: now,
          }
          const q = typed.current.text.toLowerCase()
          const hit = rows.findIndex((o) => o.label.toLowerCase().startsWith(q))
          if (hit >= 0) setActive(hit)
        }
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center gap-2 pl-3.5 pr-3 py-2.5 rounded-xl bg-ink-50 ring-1 text-sm text-left outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
          open ? 'ring-2 ring-brand-400 bg-white' : 'ring-ink-200 hover:ring-ink-300'
        } ${className}`}
      >
        <span className={`flex-1 min-w-0 truncate ${selected && selected.value !== '' ? 'text-ink-900' : 'text-ink-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.hint && selected.value !== '' && (
          <span className="shrink-0 text-xs text-ink-400 truncate max-w-[50%]">{selected.hint}</span>
        )}
        <IconChevronDown
          width={16}
          height={16}
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180 text-brand-600' : 'text-ink-400'}`}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          // render ที่ body — ถ้าอยู่ในกล่องที่ overflow ซ่อนไว้ รายการจะโดนตัด
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
            className="z-[200] overflow-y-auto scrollbar-thin rounded-xl bg-white ring-1 ring-ink-200 shadow-card-hover p-1 animate-fade-up"
          >
            {rows.length === 0 && <p className="px-3 py-2.5 text-sm text-ink-400">ไม่มีตัวเลือก</p>}
            {rows.map((o, i) => {
              const isSelected = o.value === value
              return (
                <div
                  key={`${o.value}-${i}`}
                  ref={(el) => (rowRefs.current[i] = el)}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    isSelected ? 'font-semibold text-brand-700' : o.value === '' ? 'text-ink-400' : 'text-ink-700'
                  } ${active === i ? (isSelected ? 'bg-brand-50' : 'bg-ink-100') : isSelected ? 'bg-brand-50/60' : ''}`}
                >
                  <span className="flex-1 min-w-0 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-xs text-ink-400 truncate max-w-[60%]">{o.hint}</span>}
                  {isSelected && <IconCheck width={15} height={15} className="shrink-0 text-brand-600" />}
                </div>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}
