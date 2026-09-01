import { useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import { authApi } from '../lib/api'
import { useAuth } from '../store/AuthStore'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5'

export default function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (next !== confirm) {
      setError('รหัสผ่านใหม่สองช่องไม่ตรงกัน')
      return
    }
    setError('')
    setBusy(true)
    try {
      await authApi.changePassword(current, next)
      refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="เปลี่ยนรหัสผ่าน"
      subtitle={user?.mustChangePassword ? 'ตั้งรหัสผ่านของคุณเองก่อนเริ่มใช้งาน' : user?.username}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>รหัสผ่านปัจจุบัน</label>
          <input
            type="password"
            className={inputCls}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>
        <div>
          <label className={labelCls}>รหัสผ่านใหม่</label>
          <input
            type="password"
            className={inputCls}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-[11px] text-ink-400 mt-1">อย่างน้อย 8 ตัวอักษร</p>
        </div>
        <div>
          <label className={labelCls}>ยืนยันรหัสผ่านใหม่</label>
          <input
            type="password"
            className={inputCls}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-600 bg-rose-50 ring-1 ring-rose-200/70 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <p className="text-[11px] text-ink-400">เปลี่ยนแล้วอุปกรณ์อื่นที่ล็อกอินค้างไว้จะถูกให้เข้าใหม่</p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors disabled:opacity-60"
          >
            {busy ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
