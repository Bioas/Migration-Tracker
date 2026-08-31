import { Link } from 'react-router-dom'
import { useProjects } from '../store/ProjectStore'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import ProjectFormModal from '../components/ProjectFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import ActionMenu from '../components/ActionMenu'
import { useState } from 'react'
import { Project } from '../types/project'
import { IconUser, IconBuilding, IconPin, IconArrowRight, IconPlus, IconPencil, IconTrash, IconRefresh } from '../components/Icons'

const filters = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'Active', label: 'กำลังดำเนินการ' },
  { value: 'On Hold', label: 'พักไว้' },
  { value: 'Completed', label: 'เสร็จสมบูรณ์' },
]

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject, resetAll, templates, applyTemplate, customers } =
    useProjects()
  const [filter, setFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [toDelete, setToDelete] = useState<Project | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  const filteredProjects =
    filter === 'all' ? projects : projects.filter((p) => p.projectStatus === filter)

  const getProgress = (project: Project) => {
    const total = project.phases.reduce((a, p) => a + p.tasks.length, 0)
    const completed = project.phases.reduce((a, p) => a + p.tasks.filter((t) => t.completed).length, 0)
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7 animate-fade-up">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">โปรเจกต์ทั้งหมด</h2>
          <p className="mt-1.5 text-ink-500">รายการโปรเจกต์ Migration &amp; VM Implementation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setResetOpen(true)}
            title="คืนค่าข้อมูลตัวอย่าง"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800 bg-white ring-1 ring-ink-200 hover:ring-ink-300 px-3 py-2 rounded-xl transition-all"
          >
            <IconRefresh width={16} height={16} />
            <span className="hidden sm:inline">คืนค่าตัวอย่าง</span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-4 py-2 rounded-xl transition-colors"
          >
            <IconPlus width={17} height={17} />
            เพิ่มโปรเจกต์
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-ink-100/70 ring-1 ring-ink-200/60 w-fit mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filter === f.value
                ? 'bg-white text-brand-700 shadow-soft'
                : 'text-ink-500 hover:text-ink-800 hover:bg-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 rounded-2xl ring-1 ring-dashed ring-ink-300 bg-white/60">
          <p className="text-ink-500 mb-3">
            {projects.length === 0 ? 'ยังไม่มีโปรเจกต์ — เริ่มสร้างโปรเจกต์แรกได้เลย' : 'ไม่มีโปรเจกต์ในสถานะนี้'}
          </p>
          {projects.length === 0 && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <IconPlus width={16} height={16} /> เพิ่มโปรเจกต์
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger">
          {filteredProjects.map((project) => {
            const progress = getProgress(project)
            const currentPhase = project.phases.find((p) => !p.status && p.tasks.some((t) => !t.completed))
            const completedTasks = project.phases.reduce(
              (a, p) => a + p.tasks.filter((t) => t.completed).length,
              0
            )
            const totalTasks = project.phases.reduce((a, p) => a + p.tasks.length, 0)
            const completedPhases = project.phases.filter((p) => p.status).length

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group relative bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-ink-900 group-hover:text-brand-700 transition-colors line-clamp-2">
                        {project.projectName}
                      </h3>
                      <p className="text-sm text-ink-500 mt-1 inline-flex items-center gap-1.5">
                        <IconBuilding width={14} height={14} /> {project.customer || '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={project.projectStatus} />
                      <ActionMenu
                        ariaLabel="ตัวเลือกโปรเจกต์"
                        buttonClassName="w-7 h-7 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
                        items={[
                          { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => { setEditing(project); setFormOpen(true) } },
                          { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setToDelete(project) },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex justify-between items-baseline text-sm mb-1.5">
                      <span className="text-ink-500">ความคืบหน้า</span>
                      <span className="font-bold text-ink-900 tabular-nums">{progress}%</span>
                    </div>
                    <ProgressBar percentage={progress} />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 mb-5">
                    {[
                      { v: project.phases.length, l: 'Phases' },
                      { v: `${completedTasks}/${totalTasks}`, l: 'งาน' },
                      { v: completedPhases, l: 'เสร็จแล้ว' },
                    ].map((s) => (
                      <div key={s.l} className="text-center py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200/60">
                        <p className="text-lg font-extrabold text-ink-900 tabular-nums">{s.v}</p>
                        <p className="text-[11px] text-ink-500 font-medium">{s.l}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-ink-100">
                    <span className="text-sm text-ink-500 inline-flex items-center gap-1.5 min-w-0">
                      <IconUser width={14} height={14} className="shrink-0" />
                      <span className="truncate">{project.projectOwner || '—'}</span>
                    </span>
                    {currentPhase ? (
                      <span className="text-xs font-semibold text-brand-700 bg-brand-50 ring-1 ring-brand-200/70 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shrink-0">
                        <IconPin width={13} height={13} />
                        Phase {currentPhase.phaseNumber}
                      </span>
                    ) : (
                      totalTasks > 0 && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/70 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shrink-0">
                          <IconArrowRight width={13} height={13} />
                          ทุก Phase เสร็จ
                        </span>
                      )
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        templates={templates}
        customers={customers}
        onSubmit={(data, templateId) => {
          if (editing) {
            updateProject(editing.id, data)
          } else {
            const newId = addProject(data)
            if (templateId) applyTemplate(newId, templateId, 'replace')
          }
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteProject(toDelete.id)}
        title="ลบโปรเจกต์"
        message={`ต้องการลบ "${toDelete?.projectName}" และข้อมูลทั้งหมดใช่หรือไม่? การกระทำนี้ย้อนกลับไม่ได้`}
        confirmLabel="ลบโปรเจกต์"
      />
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetAll}
        title="คืนค่าข้อมูลตัวอย่าง"
        message="ต้องการล้างข้อมูลปัจจุบันทั้งหมดและคืนค่าเป็นข้อมูลตัวอย่างเริ่มต้นใช่หรือไม่? การเปลี่ยนแปลงที่คุณทำไว้จะหายทั้งหมด"
        confirmLabel="คืนค่าตัวอย่าง"
      />
    </div>
  )
}
