import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import Select from './Select'
import ActionMenu from './ActionMenu'
import ConfirmDialog from './ConfirmDialog'
import { usersApi, type ManagedUser } from '../lib/api'
import { useAuth } from '../store/AuthStore'
import { IconUsers, IconPlus, IconPencil, IconTrash, IconCheck } from './Icons'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5'

const thCls = 'text-left text-xs font-semibold text-ink-500 uppercase tracking-wide px-4 py-3'
const tdCls = 'px-4 py-3 text-sm text-ink-700'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

/** จัดการบัญชีผู้ใช้ — เห็นเฉพาะ admin */
export default function UserAdminPanel() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [resetFor, setResetFor] = useState<ManagedUser | null>(null)
  const [toDelete, setToDelete] = useState<ManagedUser | null>(null)

  const reload = useCallback(() => {
    usersApi
      .list()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ'))
  }, [])

  useEffect(reload, [reload])

  const setRole = (u: ManagedUser, role: 'admin' | 'member') => {
    usersApi
      .setRole(u.id, role)
      .then(reload)
      .catch((err) => setError(err instanceof Error ? err.message : 'เปลี่ยนสิทธิ์ไม่สำเร็จ'))
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 sm:px-6 py-4 border-b border-ink-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-navy-700 text-white flex items-center justify-center">
            <IconUsers width={18} height={18} />
          </div>
          <div>
            <h3 className="font-bold text-ink-900">บัญชีผู้ใช้งาน</h3>
            <p className="text-xs text-ink-500">เฉพาะคนที่มีบัญชีที่นี่เท่านั้นที่เข้าเว็บได้</p>
          </div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-4 py-2.5 rounded-xl transition-colors"
        >
          <IconPlus width={16} height={16} /> เพิ่มผู้ใช้
        </button>
      </div>

      {error && <p className="px-5 sm:px-6 py-3 text-sm text-rose-600 bg-rose-50">{error}</p>}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[36rem]">
          <thead className="bg-ink-50/70">
            <tr>
              <th className={thCls}>ชื่อผู้ใช้</th>
              <th className={thCls}>ชื่อ</th>
              <th className={thCls}>สิทธิ์</th>
              <th className={thCls}>เข้าล่าสุด</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-ink-50/60 transition-colors">
                <td className={`${tdCls} font-semibold text-ink-900`}>
                  {u.username}
                  {u.id === me?.id && <span className="ml-2 text-[11px] font-medium text-ink-400">(คุณ)</span>}
                </td>
                <td className={tdCls}>{u.name || '—'}</td>
                <td className={tdCls}>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${
                      u.role === 'admin'
                        ? 'text-brand-700 bg-brand-50 ring-brand-200/70'
                        : 'text-ink-600 bg-ink-100 ring-ink-200/70'
                    }`}
                  >
                    {u.role === 'admin' ? 'ผู้ดูแล' : 'สมาชิก'}
                  </span>
                  {u.mustChangePassword && (
                    <span className="ml-2 text-[11px] text-amber-600">ยังไม่เปลี่ยนรหัส</span>
                  )}
                </td>
                <td className={`${tdCls} text-ink-500 tabular-nums`}>{formatDate(u.lastLoginAt)}</td>
                <td className="px-4 py-3 text-right">
                  <ActionMenu
                    ariaLabel="ตัวเลือกผู้ใช้"
                    items={[
                      {
                        label: 'ตั้งรหัสผ่านใหม่',
                        icon: <IconPencil width={16} height={16} />,
                        onClick: () => setResetFor(u),
                      },
                      {
                        label: u.role === 'admin' ? 'เปลี่ยนเป็นสมาชิก' : 'เปลี่ยนเป็นผู้ดูแล',
                        icon: <IconCheck width={16} height={16} />,
                        onClick: () => setRole(u, u.role === 'admin' ? 'member' : 'admin'),
                      },
                      {
                        label: 'ลบบัญชี',
                        danger: true,
                        icon: <IconTrash width={16} height={16} />,
                        onClick: () => setToDelete(u),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">
                  ยังไม่มีบัญชีผู้ใช้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onDone={reload} />
      <ResetPasswordModal user={resetFor} onClose={() => setResetFor(null)} onDone={reload} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return
          usersApi
            .delete(toDelete.id)
            .then(reload)
            .catch((err) => setError(err instanceof Error ? err.message : 'ลบบัญชีไม่สำเร็จ'))
        }}
        title="ลบบัญชีผู้ใช้"
        message={`ลบบัญชี "${toDelete?.username}" แล้วจะเข้าเว็บไม่ได้อีก ต้องการลบใช่หรือไม่?`}
        confirmLabel="ลบบัญชี"
      />
    </div>
  )
}

function AddUserModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('member')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setUsername('')
    setName('')
    setRole('member')
    setPassword('')
    setError('')
  }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await usersApi.create({ username: username.trim(), name: name.trim(), role: role as 'admin' | 'member', password })
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title="เพิ่มผู้ใช้" subtitle="ตั้งรหัสผ่านชั่วคราวแล้วส่งให้เจ้าตัวเปลี่ยนเอง">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>ชื่อผู้ใช้ (สำหรับล็อกอิน)</label>
          <input
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="เช่น somchai"
            autoFocus
            required
          />
          <p className="text-[11px] text-ink-400 mt-1">ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3-32 ตัว</p>
        </div>
        <div>
          <label className={labelCls}>ชื่อที่แสดง</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
        </div>
        <div>
          <label className={labelCls}>สิทธิ์</label>
          <Select
            ariaLabel="สิทธิ์"
            value={role}
            onChange={setRole}
            options={[
              { value: 'member', label: 'สมาชิก', hint: 'ใช้งานได้ทุกหน้า' },
              { value: 'admin', label: 'ผู้ดูแล', hint: 'จัดการบัญชีได้' },
            ]}
          />
        </div>
        <div>
          <label className={labelCls}>รหัสผ่านชั่วคราว</label>
          <input
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <p className="text-[11px] text-ink-400 mt-1">อย่างน้อย 8 ตัวอักษร — ระบบจะขอให้เจ้าตัวเปลี่ยนตอนเข้าครั้งแรก</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-600 bg-rose-50 ring-1 ring-rose-200/70 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors disabled:opacity-60"
          >
            เพิ่มผู้ใช้
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose, onDone }: { user: ManagedUser | null; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    setPassword('')
    setError('')
  }, [user])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || busy) return
    setBusy(true)
    setError('')
    try {
      await usersApi.resetPassword(user.id, password)
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!user} onClose={onClose} size="sm" title="ตั้งรหัสผ่านใหม่" subtitle={user?.username}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>รหัสผ่านใหม่</label>
          <input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoFocus required />
          <p className="text-[11px] text-ink-400 mt-1">
            ตั้งแล้วผู้ใช้คนนี้จะหลุดจากทุกอุปกรณ์ และต้องเปลี่ยนรหัสเองตอนเข้าครั้งถัดไป
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-600 bg-rose-50 ring-1 ring-rose-200/70 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors disabled:opacity-60"
          >
            บันทึก
          </button>
        </div>
      </form>
    </Modal>
  )
}
