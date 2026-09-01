import { useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import { Project, ProjectStatus, PhaseTemplate, Customer, TeamMember } from '../types/project'
import { ProjectInput } from '../store/ProjectStore'
import { IconLayers } from './Icons'

const statuses: ProjectStatus[] = ['Active', 'On Hold', 'Completed', 'Cancelled']
const statusLabels: Record<ProjectStatus, string> = {
  Active: 'กำลังดำเนินการ',
  'On Hold': 'พักไว้',
  Completed: 'เสร็จสมบูรณ์',
  Cancelled: 'ยกเลิก',
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5'

export default function ProjectFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  templates,
  customers = [],
  teamMembers = [],
}: {
  open: boolean
  onClose: () => void
  initial?: Project | null
  onSubmit: (data: ProjectInput, templateId?: string | null) => void
  templates?: PhaseTemplate[]
  customers?: Customer[]
  teamMembers?: TeamMember[]
}) {
  const [form, setForm] = useState<ProjectInput>({
    projectName: '',
    customerId: null,
    projectOwner: '',
    projectStatus: 'Active',
  })
  const [templateId, setTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTemplateId(null)
    setForm(
      initial
        ? {
            projectName: initial.projectName,
            customerId: initial.customerId ?? null,
            projectOwner: initial.projectOwner,
            projectStatus: initial.projectStatus,
          }
        : { projectName: '', customerId: null, projectOwner: '', projectStatus: 'Active' }
    )
  }, [open, initial])

  const showTemplates = !initial && templates && templates.length > 0
  // โปรเจกต์เก่าอาจมีชื่อผู้ดูแลที่ไม่มีในทีมแล้ว ถ้าไม่ใส่เป็นตัวเลือกไว้ select จะว่าง
  // แล้วค่าจะหายตอนกดบันทึก
  const ownerNotInTeam =
    form.projectOwner.trim() !== '' && !teamMembers.some((m) => m.name === form.projectOwner)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.projectName.trim()) return
    onSubmit(form, initial ? undefined : templateId)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์ใหม่'}
      subtitle={initial ? initial.projectName : 'กรอกรายละเอียดของโปรเจกต์'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>ชื่อโปรเจกต์ <span className="text-rose-500">*</span></label>
          <input
            className={inputCls}
            value={form.projectName}
            onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
            placeholder="เช่น โครงการ Migrate ระบบ VM"
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>ลูกค้า</label>
            <select
              className={inputCls}
              value={form.customerId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value || null }))}
            >
              <option value="">— ไม่ระบุ —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-[11px] text-ink-400 mt-1">ยังไม่มีลูกค้า — เพิ่มได้ที่หน้า “ลูกค้า”</p>
            )}
          </div>
          <div>
            <label className={labelCls}>ผู้ดูแล (Owner)</label>
            <select
              className={inputCls}
              value={form.projectOwner}
              onChange={(e) => setForm((f) => ({ ...f, projectOwner: e.target.value }))}
            >
              <option value="">— ไม่ระบุ —</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} — {m.role}
                </option>
              ))}
              {/* ค่าเดิมที่ไม่ได้อยู่ในทีมแล้ว — ใส่ไว้กันโดนล้างตอนบันทึก */}
              {ownerNotInTeam && <option value={form.projectOwner}>{form.projectOwner} (ไม่อยู่ในทีมแล้ว)</option>}
            </select>
            <p className="text-[11px] text-ink-400 mt-1">รายชื่อมาจากหน้า “ทีมงาน”</p>
          </div>
        </div>
        <div>
          <label className={labelCls}>สถานะ</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statuses.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setForm((f) => ({ ...f, projectStatus: s }))}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold ring-1 transition-all ${
                  form.projectStatus === s
                    ? 'bg-brand-600 text-white ring-brand-600 shadow-soft'
                    : 'bg-white text-ink-500 ring-ink-200 hover:ring-brand-300'
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
        {showTemplates && (
          <div>
            <label className={labelCls}>เริ่มจาก Template (ไม่บังคับ)</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setTemplateId(null)}
                className={`text-left px-3 py-2.5 rounded-xl ring-1 text-sm transition-all ${
                  templateId === null
                    ? 'bg-brand-50 ring-brand-300 text-brand-700 font-semibold'
                    : 'bg-white ring-ink-200 text-ink-600 hover:ring-brand-300'
                }`}
              >
                เริ่มจากว่าง — ไม่ใช้ template
              </button>
              {templates!.map((t) => {
                const tasks = t.phases.reduce((a, p) => a + p.tasks.length, 0)
                const active = templateId === t.id
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`text-left px-3 py-2.5 rounded-xl ring-1 transition-all ${
                      active ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-ink-200 hover:ring-brand-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 shrink-0 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
                        <IconLayers width={13} height={13} />
                      </span>
                      <span className={`text-sm truncate ${active ? 'text-brand-700 font-semibold' : 'text-ink-800'}`}>
                        {t.name}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] text-ink-400 tabular-nums">
                        {t.phases.length} Phase · {tasks} งาน
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
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
            {initial ? 'บันทึก' : 'เพิ่มโปรเจกต์'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
