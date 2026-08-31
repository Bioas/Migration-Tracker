import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProjects } from '../store/ProjectStore'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import PhaseCard from '../components/PhaseCard'
import ProjectFormModal from '../components/ProjectFormModal'
import PhaseFormModal from '../components/PhaseFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import TemplateModal from '../components/TemplateModal'
import RequirementCheckModal from '../components/RequirementCheckModal'
import AssetFormModal from '../components/AssetFormModal'
import ServiceFormModal from '../components/ServiceFormModal'
import ActionMenu from '../components/ActionMenu'
import ServicePanel from '../components/ServicePanel'
import AssetPanel from '../components/AssetPanel'
import { Phase, Asset, Service } from '../types/project'
import { useDndSensors } from '../hooks/useDndSensors'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PhaseGhost } from '../components/DragGhosts'
import {
  IconBuilding,
  IconUser,
  IconPin,
  IconLayers,
  IconChevronRight,
  IconArrowRight,
  IconPencil,
  IconTrash,
  IconPlus,
  IconGrid,
  IconClipboard,
  IconBalance,
} from '../components/Icons'

function SortablePhase({
  phase,
  projectId,
  onEdit,
  onDelete,
}: {
  phase: Phase
  projectId: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phase.id,
  })
  const hasProgress = phase.tasks.some((t) => t.completed)
  const state = phase.status ? 'done' : hasProgress ? 'progress' : 'idle'
  const dot = {
    done: 'bg-emerald-500 ring-emerald-100',
    progress: 'bg-amber-400 ring-amber-100',
    idle: 'bg-ink-300 ring-ink-100',
  }[state]

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative pl-14 transition-opacity ${isDragging ? 'opacity-40' : ''}`}
    >
      <span
        className={`absolute left-[14px] top-5 w-4 h-4 rounded-full ring-4 ${dot} z-10 shadow-soft`}
      />
      <PhaseCard
        phase={phase}
        projectId={projectId}
        onEditPhase={onEdit}
        onDeletePhase={onDelete}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    projects,
    customers,
    addPhase,
    updatePhase,
    deletePhase,
    movePhase,
    updateProject,
    deleteProject,
    updateAsset,
    updateService,
  } = useProjects()
  const project = projects.find((p) => p.id === id)
  const sensors = useDndSensors()
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null)

  const onPhaseDragEnd = (e: DragEndEvent) => {
    setActivePhaseId(null)
    const { active, over } = e
    if (!project || !over || active.id === over.id) return
    const ids = project.phases.map((p) => p.id)
    const from = ids.indexOf(active.id as string)
    const to = ids.indexOf(over.id as string)
    if (from >= 0 && to >= 0) movePhase(project.id, from, to)
  }

  const activePhase = project?.phases.find((p) => p.id === activePhaseId) ?? null

  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [phaseModal, setPhaseModal] = useState<{ open: boolean; phase: Phase | null }>({
    open: false,
    phase: null,
  })
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [checkOpen, setCheckOpen] = useState(false)
  // แก้ไขรายการที่ข้อมูลไม่ครบจากหน้าตรวจสอบ — ปิดฟอร์มแล้วกลับมาหน้าตรวจสอบต่อ
  const [fixAsset, setFixAsset] = useState<Asset | null>(null)
  const [fixService, setFixService] = useState<Service | null>(null)
  const [tab, setTab] = useState<'phases' | 'assets' | 'services'>('phases')

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center text-ink-400">
            <IconLayers width={30} height={30} />
          </div>
          <p className="text-ink-600 text-lg font-medium">ไม่พบโปรเจกต์ที่ระบุ</p>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-semibold"
          >
            <IconArrowRight width={16} height={16} className="rotate-180" />
            กลับไปหน้าโปรเจกต์ทั้งหมด
          </Link>
        </div>
      </div>
    )
  }

  const totalTasks = project.phases.reduce((a, p) => a + p.tasks.length, 0)
  const completedTasks = project.phases.reduce((a, p) => a + p.tasks.filter((t) => t.completed).length, 0)
  const completedPhases = project.phases.filter((p) => p.status).length
  const currentPhase = project.phases.find((p) => !p.status && p.tasks.some((t) => !t.completed))
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const summary = [
    { v: project.phases.length, l: 'Phases ทั้งหมด', tint: 'text-brand-600 bg-brand-50 ring-brand-200/60' },
    { v: completedPhases, l: 'Phases เสร็จแล้ว', tint: 'text-emerald-600 bg-emerald-50 ring-emerald-200/60' },
    { v: totalTasks, l: 'งานทั้งหมด', tint: 'text-teal-600 bg-teal-50 ring-teal-200/60' },
    { v: completedTasks, l: 'งานเสร็จแล้ว', tint: 'text-navy-600 bg-navy-50 ring-navy-200/60' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-400 mb-6 animate-fade-in">
        <Link to="/" className="hover:text-brand-600 transition-colors">แดชบอร์ด</Link>
        <IconChevronRight width={14} height={14} />
        <Link to="/projects" className="hover:text-brand-600 transition-colors">โปรเจกต์</Link>
        <IconChevronRight width={14} height={14} />
        <span className="text-ink-700 font-medium truncate max-w-[200px] sm:max-w-none">{project.projectName}</span>
      </nav>

      {/* Project Header */}
      <div className="relative overflow-hidden bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card p-6 sm:p-7 mb-6 animate-fade-up">
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-gradient opacity-[0.06] blur-2xl rounded-full" />
        <div className="relative flex flex-col items-start sm:flex-row sm:justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">{project.projectName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <IconBuilding width={15} height={15} /> {project.customer || '—'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconUser width={15} height={15} /> {project.projectOwner || '—'}
              </span>
              {currentPhase && (
                <span className="inline-flex items-center gap-1.5 text-brand-700 font-semibold bg-brand-50 ring-1 ring-brand-200/70 px-2.5 py-0.5 rounded-full">
                  <IconPin width={14} height={14} />
                  Phase {currentPhase.phaseNumber}: {currentPhase.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={project.projectStatus} />
            <ActionMenu
              ariaLabel="ตัวเลือกโปรเจกต์"
              buttonClassName="w-8 h-8 rounded-lg text-ink-400 hover:text-ink-700 bg-ink-50 hover:bg-ink-100 ring-1 ring-ink-200/70 flex items-center justify-center transition-colors"
              items={[
                { label: 'แก้ไขโปรเจกต์', icon: <IconPencil width={16} height={16} />, onClick: () => setEditProjectOpen(true) },
                { label: 'ลบโปรเจกต์', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setDeleteProjectOpen(true) },
              ]}
            />
          </div>
        </div>

        <div className="relative mt-5">
          <div className="flex justify-between items-baseline text-sm mb-2">
            <span className="text-ink-500">ความคืบหน้ารวม</span>
            <span className="font-bold text-ink-900 tabular-nums">
              {progress}% <span className="text-ink-400 font-medium">({completedTasks}/{totalTasks} งาน)</span>
            </span>
          </div>
          <ProgressBar percentage={progress} size="lg" />
        </div>

        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {summary.map((s) => (
            <div key={s.l} className={`text-center py-4 rounded-xl ring-1 ${s.tint}`}>
              <p className="text-2xl font-extrabold tabular-nums">{s.v}</p>
              <p className="text-xs text-ink-500 mt-0.5 font-medium">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Requirement Check */}
      <button
        onClick={() => setCheckOpen(true)}
        className="w-full mb-6 flex items-center gap-3 text-left bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-soft hover:shadow-card hover:ring-brand-200 transition-all p-4 group"
      >
        <span className="w-11 h-11 shrink-0 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-200/60 flex items-center justify-center">
          <IconClipboard width={22} height={22} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-ink-900">ตรวจสอบความครบถ้วนของข้อมูล</span>
          <span className="block text-sm text-ink-500">ตรวจว่ายังขาดข้อมูลอะไร และร่างคำถามส่งลูกค้า</span>
        </span>
        <IconArrowRight width={18} height={18} className="text-ink-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-ink-100/70 ring-1 ring-ink-200/60 w-fit mb-5">
        <button
          onClick={() => setTab('phases')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'phases' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-500 hover:text-ink-800'}`}
        >
          <IconLayers width={16} height={16} /> Phase Timeline
          <span className="text-[11px] font-semibold text-ink-400 tabular-nums">{project.phases.length}</span>
        </button>
        <button
          onClick={() => setTab('assets')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'assets' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-500 hover:text-ink-800'}`}
        >
          <IconGrid width={16} height={16} /> VMs
          <span className="text-[11px] font-semibold text-ink-400 tabular-nums">{project.assets.length}</span>
        </button>
        <button
          onClick={() => setTab('services')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'services' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-500 hover:text-ink-800'}`}
        >
          <IconBalance width={16} height={16} /> Service
          <span className="text-[11px] font-semibold text-ink-400 tabular-nums">{project.services.length}</span>
        </button>
      </div>

      {/* Phase Timeline */}
      <div className={tab === 'phases' ? 'mb-6' : 'hidden'}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <IconLayers width={19} height={19} className="text-brand-600" />
            <h2 className="text-lg font-bold text-ink-900">Phase Timeline</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTemplateOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 bg-white ring-1 ring-ink-200 hover:ring-brand-300 hover:text-brand-700 px-3 py-2 rounded-xl transition-all"
            >
              <IconLayers width={16} height={16} />
              <span className="hidden sm:inline">Template</span>
            </button>
            <button
              onClick={() => setPhaseModal({ open: true, phase: null })}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-3.5 py-2 rounded-xl transition-colors"
            >
              <IconPlus width={16} height={16} />
              <span className="hidden sm:inline">เพิ่ม Phase</span>
              <span className="sm:hidden">Phase</span>
            </button>
          </div>
        </div>

        {project.phases.length === 0 ? (
          <div className="text-center py-16 rounded-2xl ring-1 ring-dashed ring-ink-300 bg-white/60">
            <p className="text-ink-500 mb-4">ยังไม่มี Phase ในโปรเจกต์นี้</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setTemplateOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-4 py-2 rounded-xl transition-colors"
              >
                <IconLayers width={16} height={16} /> เริ่มจาก Template
              </button>
              <button
                onClick={() => setPhaseModal({ open: true, phase: null })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                <IconPlus width={16} height={16} /> เพิ่ม Phase แรก
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[22px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-200 via-ink-200 to-ink-100" />
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e: DragStartEvent) => setActivePhaseId(e.active.id as string)}
              onDragEnd={onPhaseDragEnd}
              onDragCancel={() => setActivePhaseId(null)}
            >
              <SortableContext items={project.phases.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {project.phases.map((phase) => (
                    <SortablePhase
                      key={phase.id}
                      phase={phase}
                      projectId={project.id}
                      onEdit={() => setPhaseModal({ open: true, phase })}
                      onDelete={() => setPhaseToDelete(phase)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
                {activePhase ? (
                  <div className="pl-14">
                    <PhaseGhost phase={activePhase} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      <AssetPanel project={project} active={tab === 'assets'} />

      <ServicePanel project={project} active={tab === 'services'} />

      {/* Modals */}
      <ProjectFormModal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        initial={project}
        customers={customers}
        onSubmit={(data) => updateProject(project.id, data)}
      />
      <PhaseFormModal
        open={phaseModal.open}
        onClose={() => setPhaseModal({ open: false, phase: null })}
        initial={phaseModal.phase}
        onSubmit={(data) => {
          if (phaseModal.phase) updatePhase(project.id, phaseModal.phase.id, data)
          else addPhase(project.id, data)
        }}
      />
      <ConfirmDialog
        open={deleteProjectOpen}
        onClose={() => setDeleteProjectOpen(false)}
        onConfirm={() => {
          deleteProject(project.id)
          navigate('/projects')
        }}
        title="ลบโปรเจกต์"
        message={`ต้องการลบ "${project.projectName}" และข้อมูล Phase/งานทั้งหมดใช่หรือไม่? การกระทำนี้ย้อนกลับไม่ได้`}
        confirmLabel="ลบโปรเจกต์"
      />
      <ConfirmDialog
        open={!!phaseToDelete}
        onClose={() => setPhaseToDelete(null)}
        onConfirm={() => phaseToDelete && deletePhase(project.id, phaseToDelete.id)}
        title="ลบ Phase"
        message={`ต้องการลบ Phase "${phaseToDelete?.name}" และงานทั้งหมดใน Phase นี้ใช่หรือไม่?`}
        confirmLabel="ลบ Phase"
      />
      <RequirementCheckModal
        open={checkOpen}
        onClose={() => setCheckOpen(false)}
        project={project}
        onEdit={(cat, entityId) => {
          if (cat === 'VMs') {
            const a = (project.assets ?? []).find((x) => x.id === entityId)
            if (!a) return
            setCheckOpen(false)
            setFixAsset(a)
          } else {
            const sv = (project.services ?? []).find((x) => x.id === entityId)
            if (!sv) return
            setCheckOpen(false)
            setFixService(sv)
          }
        }}
      />
      <AssetFormModal
        open={!!fixAsset}
        initial={fixAsset}
        onClose={() => {
          setFixAsset(null)
          setCheckOpen(true)
        }}
        onSubmit={(data) => fixAsset && updateAsset(project.id, fixAsset.id, data)}
      />
      <ServiceFormModal
        open={!!fixService}
        initial={fixService}
        onClose={() => {
          setFixService(null)
          setCheckOpen(true)
        }}
        onSubmit={(data) => fixService && updateService(project.id, fixService.id, data)}
      />
      <TemplateModal open={templateOpen} onClose={() => setTemplateOpen(false)} project={project} />
    </div>
  )
}
