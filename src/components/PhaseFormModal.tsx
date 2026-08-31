import { useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import { Phase } from '../types/project'
import { PhaseInput } from '../store/ProjectStore'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5'

export default function PhaseFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Phase | null
  onSubmit: (data: PhaseInput) => void
}) {
  const [form, setForm] = useState<PhaseInput>({ name: '', mainActivity: '' })

  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? { name: initial.name, mainActivity: initial.mainActivity }
        : { name: '', mainActivity: '' }
    )
  }, [open, initial])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit(form)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `แก้ไข Phase ${initial.phaseNumber}` : 'เพิ่ม Phase ใหม่'}
      subtitle={initial ? initial.name : 'เพิ่มขั้นตอนใหม่ให้โปรเจกต์'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>ชื่อ Phase <span className="text-rose-500">*</span></label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="เช่น Testing & Validation"
            autoFocus
            required
          />
        </div>
        <div>
          <label className={labelCls}>กิจกรรมหลัก</label>
          <input
            className={inputCls}
            value={form.mainActivity}
            onChange={(e) => setForm((f) => ({ ...f, mainActivity: e.target.value }))}
            placeholder="เช่น Cutover"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors"
          >
            {initial ? 'บันทึก' : 'เพิ่ม Phase'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
