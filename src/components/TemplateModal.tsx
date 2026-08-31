import { useEffect, useState } from 'react'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import { useProjects } from '../store/ProjectStore'
import { Project, PhaseTemplate } from '../types/project'
import { IconLayers, IconPlus, IconTrash, IconCheck, IconClipboard } from './Icons'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'

function templateStats(t: PhaseTemplate) {
  const tasks = t.phases.reduce((a, p) => a + p.tasks.length, 0)
  return { phases: t.phases.length, tasks }
}

type Tab = 'use' | 'save'

export default function TemplateModal({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project: Project
}) {
  const { templates, applyTemplate, saveTemplate, deleteTemplate } = useProjects()
  const [tab, setTab] = useState<Tab>('use')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saved, setSaved] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<PhaseTemplate | null>(null)
  const [toDelete, setToDelete] = useState<PhaseTemplate | null>(null)

  const hasPhases = project.phases.length > 0

  // Reset transient state each time the modal opens
  useEffect(() => {
    if (!open) return
    setTab('use')
    setQuery('')
    setName('')
    setDesc('')
    setSaved(false)
  }, [open])

  const filtered = templates.filter((t) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    )
  })

  const handleSave = () => {
    if (!name.trim() || !hasPhases) return
    saveTemplate(name, desc, project.phases)
    setName('')
    setDesc('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    setTab('use')
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Template ของ Phase Timeline"
        subtitle="ใช้ template สำเร็จรูป หรือบันทึก timeline นี้ไว้ใช้ซ้ำ"
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-ink-100/70 ring-1 ring-ink-200/60 mb-5">
          <button
            onClick={() => setTab('use')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'use'
                ? 'bg-white text-brand-700 shadow-soft'
                : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            <IconLayers width={16} height={16} />
            ใช้ Template
            <span className="ml-0.5 text-[11px] font-semibold text-ink-400 tabular-nums">
              {templates.length}
            </span>
          </button>
          <button
            onClick={() => setTab('save')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'save'
                ? 'bg-white text-brand-700 shadow-soft'
                : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            <IconClipboard width={16} height={16} />
            บันทึกเป็น Template
          </button>
        </div>

        {tab === 'use' ? (
          <div>
            {templates.length > 4 && (
              <input
                className={`${inputCls} mb-3`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา template…"
              />
            )}
            <div className="space-y-2.5 max-h-[52vh] overflow-y-auto scrollbar-thin -mx-1 px-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-ink-400 italic text-center py-8">
                  ไม่พบ template ที่ตรงกับ “{query}”
                </p>
              ) : (
                filtered.map((t) => {
                  const { phases, tasks } = templateStats(t)
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl ring-1 ring-ink-200/70 bg-white p-3.5 hover:ring-brand-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 shrink-0 rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200/60 flex items-center justify-center">
                              <IconLayers width={15} height={15} />
                            </span>
                            <h5 className="font-semibold text-ink-900 truncate">{t.name}</h5>
                            {t.builtIn && (
                              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-ink-100 text-ink-500 ring-1 ring-ink-200">
                                สำเร็จรูป
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-xs text-ink-500 mt-1 line-clamp-2">{t.description}</p>
                          )}
                          <p className="text-[11px] text-ink-400 mt-1 tabular-nums">
                            {phases} Phase · {tasks} งาน
                          </p>
                        </div>
                        {!t.builtIn && (
                          <button
                            onClick={() => setToDelete(t)}
                            aria-label="ลบ template"
                            className="shrink-0 w-7 h-7 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          >
                            <IconTrash width={15} height={15} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => {
                            applyTemplate(project.id, t.id, 'append')
                            onClose()
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 ring-1 ring-brand-200/70 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <IconPlus width={14} height={14} />
                          เพิ่มต่อท้าย
                        </button>
                        <button
                          onClick={() =>
                            hasPhases
                              ? setReplaceTarget(t)
                              : (applyTemplate(project.id, t.id, 'replace'), onClose())
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 bg-ink-50 hover:bg-ink-100 ring-1 ring-ink-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          แทนที่ทั้งหมด
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div>
            {!hasPhases ? (
              <div className="text-center py-10">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-ink-100 text-ink-400 items-center justify-center mb-3">
                  <IconLayers width={24} height={24} />
                </div>
                <p className="text-sm text-ink-500">
                  โปรเจกต์นี้ยังไม่มี Phase — เพิ่ม Phase ก่อนจึงจะบันทึกเป็น template ได้
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-brand-50/60 ring-1 ring-brand-200/50 p-3.5 flex items-center gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-white text-brand-600 ring-1 ring-brand-200/60 flex items-center justify-center">
                    <IconClipboard width={18} height={18} />
                  </span>
                  <p className="text-sm text-ink-600">
                    จะบันทึก timeline ปัจจุบัน{' '}
                    <span className="font-semibold text-ink-900 tabular-nums">
                      {project.phases.length} Phase ·{' '}
                      {project.phases.reduce((a, p) => a + p.tasks.length, 0)} งาน
                    </span>{' '}
                    (สถานะงานจะถูกรีเซ็ตเป็นยังไม่เสร็จ)
                  </p>
                </div>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อ template เช่น Migration แบบเร่งด่วน"
                  autoFocus
                />
                <input
                  className={inputCls}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="คำอธิบาย (ไม่บังคับ)"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={!name.trim()}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-xl transition-all ${
                      name.trim()
                        ? 'text-white bg-navy-700 hover:bg-navy-800 shadow-soft'
                        : 'text-ink-400 bg-ink-100 cursor-not-allowed'
                    }`}
                  >
                    {saved ? <IconCheck width={16} height={16} /> : <IconClipboard width={16} height={16} />}
                    {saved ? 'บันทึกแล้ว' : 'บันทึก Template'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!replaceTarget}
        onClose={() => setReplaceTarget(null)}
        onConfirm={() => {
          if (replaceTarget) {
            applyTemplate(project.id, replaceTarget.id, 'replace')
            onClose()
          }
        }}
        title="แทนที่ Phase ทั้งหมด"
        message={`Phase และงานทั้งหมดในโปรเจกต์นี้จะถูกแทนที่ด้วย "${replaceTarget?.name}" — ต้องการดำเนินการต่อหรือไม่?`}
        confirmLabel="แทนที่"
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteTemplate(toDelete.id)}
        title="ลบ Template"
        message={`ต้องการลบ template "${toDelete?.name}" ใช่หรือไม่?`}
        confirmLabel="ลบ Template"
      />
    </>
  )
}
