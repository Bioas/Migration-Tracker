import { useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import { Customer } from '../types/project'
import { CustomerInput } from '../store/ProjectStore'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5'

const empty: CustomerInput = {
  name: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  industry: '',
  note: '',
}

export default function CustomerFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Customer | null
  onSubmit: (data: CustomerInput) => void
}) {
  const [form, setForm] = useState<CustomerInput>(empty)

  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? {
            name: initial.name,
            contactName: initial.contactName ?? '',
            contactEmail: initial.contactEmail ?? '',
            contactPhone: initial.contactPhone ?? '',
            industry: initial.industry ?? '',
            note: initial.note ?? '',
          }
        : empty
    )
  }, [open, initial])

  const set = (k: keyof CustomerInput, v: string) => setForm((f) => ({ ...f, [k]: v }))

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
      title={initial ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}
      subtitle={initial ? initial.name : 'ข้อมูลลูกค้าและผู้ติดต่อ'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>ชื่อลูกค้า / องค์กร <span className="text-rose-500">*</span></label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="เช่น GDCC"
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>ผู้ติดต่อ</label>
            <input
              className={inputCls}
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
              placeholder="ชื่อผู้ติดต่อ"
            />
          </div>
          <div>
            <label className={labelCls}>อุตสาหกรรม</label>
            <input
              className={inputCls}
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              placeholder="เช่น ภาครัฐ / พลังงาน"
            />
          </div>
          <div>
            <label className={labelCls}>อีเมล</label>
            <input
              className={inputCls}
              value={form.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className={labelCls}>เบอร์โทร</label>
            <input
              className={inputCls}
              value={form.contactPhone}
              onChange={(e) => set('contactPhone', e.target.value)}
              placeholder="02-000-0000"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>หมายเหตุ</label>
          <input
            className={inputCls}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
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
            {initial ? 'บันทึก' : 'เพิ่มลูกค้า'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
