import { Phase, Task } from '../types/project'
import ProgressBar from './ProgressBar'
import { IconCheck, IconGrip } from './Icons'

/** Floating clone shown in the DragOverlay while dragging a phase. */
export function PhaseGhost({ phase }: { phase: Phase }) {
  const completed = phase.tasks.filter((t) => t.completed).length
  const total = phase.tasks.length
  const pct = total > 0 ? (completed / total) * 100 : 0
  const state = phase.status ? 'done' : pct > 0 ? 'progress' : 'idle'
  const badge = {
    done: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    progress: 'bg-amber-100 text-amber-700 ring-amber-200',
    idle: 'bg-ink-100 text-ink-500 ring-ink-200',
  }[state]

  return (
    <div className="bg-white rounded-2xl ring-1 ring-brand-300 shadow-card-hover px-5 py-4 cursor-grabbing scale-[1.03] rotate-[0.5deg]">
      <div className="flex items-center gap-2">
        <span className="shrink-0 w-6 h-11 -ml-1 flex items-center justify-center text-brand-400">
          <IconGrip width={18} height={18} />
        </span>
        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold ring-1 ${badge}`}>
          {state === 'done' ? <IconCheck width={20} height={20} /> : phase.phaseNumber}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink-900 truncate">{phase.name}</h3>
          <p className="text-sm text-ink-500 truncate">{phase.mainActivity || '—'}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-ink-800 tabular-nums">
            {completed}
            <span className="text-ink-400 font-medium">/{total}</span>
          </p>
          <p className="text-[11px] text-ink-400 font-medium">งาน</p>
        </div>
      </div>
      <div className="mt-3.5">
        <ProgressBar percentage={pct} size="sm" />
      </div>
    </div>
  )
}

/** Floating clone shown in the DragOverlay while dragging a task. */
export function TaskGhost({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl ring-1 ring-brand-300 shadow-card-hover px-3 py-2.5 cursor-grabbing scale-[1.02]">
      <span className="shrink-0 text-brand-400">
        <IconGrip width={15} height={15} />
      </span>
      <span
        className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
          task.completed ? 'bg-emerald-500 text-white' : 'bg-white ring-2 ring-ink-300 ring-inset'
        }`}
      >
        {task.completed && <IconCheck width={13} height={13} strokeWidth={2.6} />}
      </span>
      <span className={`text-sm ${task.completed ? 'text-ink-400 line-through' : 'text-ink-800'}`}>
        {task.description}
      </span>
    </div>
  )
}
