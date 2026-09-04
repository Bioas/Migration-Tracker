import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from './Icons'

export type ModalSize = 'sm' | 'md' | 'lg'

// กว้างขึ้นตามขนาดจอ — จอ desktop กว้าง ๆ จะได้ไม่เหลือที่ว่างสองข้างมากเกินไป
const SIZE_CLS: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg lg:max-w-xl',
  lg: 'sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl',
}

// นับจำนวน modal ที่เปิดอยู่ — ปลดล็อก scroll ของ body เฉพาะตอนปิดตัวสุดท้าย
// (กันบั๊ก modal ซ้อน modal แล้ว restore ค่า overflow ผิดลำดับจน body ค้าง hidden)
let openModalCount = 0

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  wide,
  size,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** alias ของ size="lg" — คงไว้เพื่อไม่ต้องแก้ที่เรียกใช้เดิม */
  wide?: boolean
  /** sm = ยืนยัน/ข้อความสั้น · md = ฟอร์มทั่วไป · lg = ฟอร์มหลายคอลัมน์ / ตาราง */
  size?: ModalSize
  children: ReactNode
}) {
  const resolved: ModalSize = size ?? (wide ? 'lg' : 'md')
  // คงไว้ชั่วครู่หลังสั่งปิด เพื่อให้เล่น animation ออกก่อนถอด DOM
  const [render, setRender] = useState(open)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (open) {
      setRender(true)
      setClosing(false)
      return
    }
    if (!render) return
    setClosing(true)
    const t = window.setTimeout(() => {
      setRender(false)
      setClosing(false)
    }, 150)
    return () => window.clearTimeout(t)
  }, [open, render])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    openModalCount++
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      openModalCount = Math.max(0, openModalCount - 1)
      if (openModalCount === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!render) return null

  // render ที่ body เสมอ — ถ้าอยู่ใต้ ancestor ที่มี transform/filter จะทำให้
  // position:fixed อิงกับ ancestor นั้นแทน viewport แล้ว overlay คลุมไม่เต็มจอ
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`absolute inset-0 bg-ink-900/45 backdrop-blur-sm transition-opacity duration-150 ${closing ? 'opacity-0' : 'animate-fade-in'}`}
        onClick={onClose}
      />
      <div className={`relative w-full ${SIZE_CLS[resolved]} bg-white rounded-t-2xl sm:rounded-2xl ring-1 ring-ink-200 shadow-card-hover ${closing ? 'opacity-0 transition-opacity duration-150' : 'animate-fade-up'} max-h-[92vh] overflow-y-auto scrollbar-thin`}>
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-ink-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
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
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}
