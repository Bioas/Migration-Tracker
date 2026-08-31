import { Link } from 'react-router-dom'
import { useProjects } from '../store/ProjectStore'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import {
  IconFolder,
  IconBolt,
  IconLayers,
  IconCheckCircle,
  IconUser,
  IconBuilding,
  IconClipboard,
  IconArrowRight,
  IconChevronRight,
} from '../components/Icons'

export default function Dashboard() {
  const { projects } = useProjects()
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.projectStatus === 'Active').length
  const totalPhases = projects.reduce((acc, p) => acc + p.phases.length, 0)
  const completedPhases = projects.reduce(
    (acc, p) => acc + p.phases.filter((ph) => ph.status).length,
    0
  )
  const totalTasksAll = projects.reduce((a, p) => a + p.phases.reduce((b, ph) => b + ph.tasks.length, 0), 0)
  const completedTasksAll = projects.reduce(
    (a, p) => a + p.phases.reduce((b, ph) => b + ph.tasks.filter((t) => t.completed).length, 0),
    0
  )
  const overallProgress = totalTasksAll > 0 ? Math.round((completedTasksAll / totalTasksAll) * 100) : 0

  const stats = [
    { label: 'โปรเจกต์ทั้งหมด', value: totalProjects, Icon: IconFolder, tint: 'from-brand-500 to-brand-700' },
    { label: 'กำลังดำเนินการ', value: activeProjects, Icon: IconBolt, tint: 'from-emerald-500 to-teal-500' },
    { label: 'Phase ทั้งหมด', value: totalPhases, Icon: IconLayers, tint: 'from-cyan-500 to-teal-600' },
    { label: 'Phase ที่เสร็จแล้ว', value: completedPhases, Icon: IconCheckCircle, tint: 'from-navy-600 to-navy-800' },
  ]

  const getProjectProgress = (project: (typeof projects)[number]) => {
    const total = project.phases.length
    const completed = project.phases.filter((p) => p.status).length
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-navy-gradient text-white p-7 sm:p-9 mb-8 shadow-card animate-fade-up">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-teal-400/15 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/15 ring-1 ring-white/25">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              ภาพรวมสถานะโครงการ
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">ภาพรวมโปรเจกต์</h2>
            <p className="mt-2 text-white/75 max-w-lg">
              ติดตามความคืบหน้าการ Migrate &amp; Implement VM Cloud Server ของทีมได้แบบเรียลไทม์
            </p>
          </div>
          <div className="shrink-0 w-full lg:w-72 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-sm">ความคืบหน้ารวม</p>
                <p className="text-4xl font-extrabold tabular-nums">{overallProgress}%</p>
              </div>
              <p className="text-white/70 text-sm tabular-nums">
                {completedTasksAll}/{totalTasksAll} งาน
              </p>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group bg-white rounded-2xl ring-1 ring-ink-200/70 p-5 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.tint} flex items-center justify-center text-white shadow-soft mb-4`}
            >
              <stat.Icon width={22} height={22} />
            </div>
            <p className="text-3xl font-extrabold text-ink-900 tabular-nums leading-none">{stat.value}</p>
            <p className="text-sm text-ink-500 mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Project List */}
      <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconFolder width={18} height={18} className="text-brand-600" />
            <h3 className="text-base font-bold text-ink-900">โปรเจกต์ล่าสุด</h3>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-semibold group"
          >
            ดูทั้งหมด
            <IconArrowRight width={15} height={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="divide-y divide-ink-100">
          {projects.map((project) => {
            const progress = getProjectProgress(project)
            const totalTasks = project.phases.reduce((a, p) => a + p.tasks.length, 0)
            const completedTasks = project.phases.reduce(
              (a, p) => a + p.tasks.filter((t) => t.completed).length,
              0
            )
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-ink-50/70 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h4 className="font-semibold text-ink-900 truncate group-hover:text-brand-700 transition-colors">
                      {project.projectName}
                    </h4>
                    <StatusBadge status={project.projectStatus} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <IconUser width={14} height={14} /> {project.projectOwner}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IconBuilding width={14} height={14} /> {project.customer}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IconClipboard width={14} height={14} /> {completedTasks}/{totalTasks} งาน
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <div className="w-36">
                    <div className="flex justify-end text-xs font-semibold text-ink-600 mb-1 tabular-nums">
                      {progress}%
                    </div>
                    <ProgressBar percentage={progress} size="sm" />
                  </div>
                  <IconChevronRight
                    width={18}
                    height={18}
                    className="text-ink-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Phase Summary */}
      <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <IconLayers width={18} height={18} className="text-brand-600" />
          <h3 className="text-base font-bold text-ink-900">สรุป Phase แต่ละโปรเจกต์</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="rounded-xl ring-1 ring-ink-200/70 p-4 bg-ink-50/40">
              <h4 className="font-semibold text-ink-900 mb-3.5 text-sm truncate">{project.projectName}</h4>
              <div className="space-y-2.5">
                {project.phases.map((phase) => {
                  const done = phase.tasks.filter((t) => t.completed).length
                  const total = phase.tasks.length
                  const state = phase.status ? 'done' : done > 0 ? 'progress' : 'idle'
                  const dot = { done: 'bg-emerald-500', progress: 'bg-amber-400', idle: 'bg-ink-300' }[state]
                  return (
                    <div key={phase.id} className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                      <span className="text-xs text-ink-600 truncate flex-1">
                        <span className="font-semibold text-ink-400">{phase.phaseNumber}.</span> {phase.name}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-400 tabular-nums shrink-0">
                        {done}/{total}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
