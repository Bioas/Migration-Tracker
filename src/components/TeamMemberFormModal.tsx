import { useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import { Project, TeamMember } from '../types/project'
import { TeamMemberInput } from '../store/ProjectStore'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5'

/** ตำแหน่งที่ใช้บ่อย — พิมพ์เองได้ถ้าไม่มีในนี้ */
const ROLE_SUGGESTIONS = ['Project Manager', 'Migration Engineer', 'Cloud Implementer', 'Network Engineer', 'Pre-sales']

const empty: TeamMemberInput = { name: '', role: '', projects: [] }

export default function TeamMemberFormModal({
  open,
  onClose,
  initial,
  projects,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: TeamMember | null
  projects: Project[]
  onSubmit: (data: TeamMemberInput) => void
}) {
  const [form, setForm] = useState<TeamMemberInput>(empty)

  useEffect(() => {
    if (!open) return
    setForm(initial ? { name: initial.name, role: initial.role, projects: [...initial.projects] } : empty)
  }, [open, initial])

  const toggleProject = (id: string) =>
    setForm((f) => ({
      ...f,
      projects: f.projects.includes(id) ? f.projects.filter((x) => x !== id) : [...f.projects, id],
    }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ ...form, name: form.name.trim(), role: form.role.trim() })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกทีม'}
      subtitle={initial ? initial.name : 'ทีม Migrate & Implement VM Cloud Server'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>
            ชื่อ <span className="text-rose-500">*</span>
          </label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="เช่น สมชาย ใจดี"
            autoFocus
          />
        </div>

        <div>
          <label className={labelCls}>ตำแหน่ง</label>
          <input
            className={inputCls}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="เช่น Migration Engineer"
            list="team-role-suggestions"
          />
          <datalist id="team-role-suggestions">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <div>
          <label className={labelCls}>โปรเจกต์ที่รับผิดชอบ</label>
          {projects.length === 0 ? (
            <p className="text-sm text-ink-400">ยังไม่มีโปรเจกต์ในระบบ</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin rounded-xl ring-1 ring-ink-200 bg-ink-50/60 p-2">
              {projects.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={form.projects.includes(p.id)}
                    onChange={() => toggleProject(p.id)}
                    className="w-4 h-4 accent-[#232152] shrink-0"
                  />
                  <span className="text-sm text-ink-700 truncate">{p.projectName}</span>
                </label>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-400 mt-1">
            เลือกแล้ว {form.projects.length} โปรเจกต์
          </p>
        </div>

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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors"
          >
            {initial ? 'บันทึก' : 'เพิ่มสมาชิก'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
