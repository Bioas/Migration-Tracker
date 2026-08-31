import { useState, type KeyboardEvent } from 'react'
import { Phase, Task } from '../types/project'
import ProgressBar from './ProgressBar'
import { IconCheck, IconPencil, IconTrash, IconPlus, IconX, IconGrip } from './Icons'
import { useProjects } from '../store/ProjectStore'
import ActionMenu from './ActionMenu'
import { useDndSensors } from '../hooks/useDndSensors'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskGhost } from './DragGhosts'

function TaskRow({
  task,
  projectId,
  phaseId,
}: {
  task: Task
  projectId: string
  phaseId: string
}) {
  const { toggleTask, updateTask, deleteTask } = useProjects()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.description)

  const style = { transform: CSS.Transform.toString(transform), transition }

  const commit = () => {
    updateTask(projectId, phaseId, task.id, text)
    setEditing(false)
  }
  const cancel = () => {
    setText(task.description)
    setEditing(false)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group/task rounded-lg transition-opacity ${isDragging ? 'opacity-40' : ''}`}
    >
      {editing ? (
        <div className="flex items-center gap-2 py-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            onBlur={commit}
            autoFocus
            className="flex-1 px-3 py-1.5 rounded-lg bg-ink-50 ring-1 ring-brand-300 focus:ring-2 focus:ring-brand-400 outline-none text-sm text-ink-900"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            className="shrink-0 w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center"
            aria-label="บันทึก"
          >
            <IconCheck width={16} height={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-0.5">
          <button
            {...attributes}
            {...listeners}
            aria-label="ลากเพื่อจัดลำดับงาน"
            title="ลากเพื่อจัดลำดับ"
            className="shrink-0 w-5 h-8 flex items-center justify-center text-ink-300 hover:text-ink-500 cursor-grab active:cursor-grabbing touch-none sm:opacity-0 sm:group-hover/task:opacity-100 transition-opacity"
          >
            <IconGrip width={15} height={15} />
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={task.completed}
            onClick={() => toggleTask(task.id)}
            className="flex items-start gap-3 flex-1 text-left rounded-lg px-1.5 py-1.5 hover:bg-ink-50 transition-colors min-w-0"
          >
            <span
              className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                task.completed
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white ring-2 ring-ink-300 ring-inset group-hover/task:ring-brand-400'
              }`}
            >
              {task.completed && <IconCheck width={13} height={13} strokeWidth={2.6} />}
            </span>
            <span
              className={`text-sm leading-relaxed transition-colors ${
                task.completed
                  ? 'text-ink-400 line-through'
                  : 'text-ink-700 group-hover/task:text-ink-900'
              }`}
            >
              {task.description}
            </span>
          </button>
          <div className="pt-0.5 shrink-0">
            <ActionMenu
              ariaLabel="ตัวเลือกงาน"
              buttonClassName="w-7 h-7 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
              items={[
                { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => { setText(task.description); setEditing(true) } },
                { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => deleteTask(projectId, phaseId, task.id) },
              ]}
            />
          </div>
        </div>
      )}
    </li>
  )
}

export default function PhaseCard({
  phase,
  projectId,
  onEditPhase,
  onDeletePhase,
  dragAttributes,
  dragListeners,
}: {
  phase: Phase
  projectId: string
  onEditPhase: () => void
  onDeletePhase: () => void
  dragAttributes?: DraggableAttributes
  dragListeners?: DraggableSyntheticListeners
}) {
  const { addTask, moveTask } = useProjects()
  const sensors = useDndSensors()
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const activeTask = phase.tasks.find((t) => t.id === activeTaskId) ?? null

  const completedTasks = phase.tasks.filter((t) => t.completed).length
  const totalTasks = phase.tasks.length
  const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const state = phase.status ? 'done' : percentage > 0 ? 'progress' : 'idle'
  const badge = {
    done: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    progress: 'bg-amber-100 text-amber-700 ring-amber-200',
    idle: 'bg-ink-100 text-ink-500 ring-ink-200',
  }[state]
  const label = { done: 'เสร็จแล้ว', progress: 'กำลังทำ', idle: 'รอเริ่ม' }[state]

  const commitAdd = () => {
    if (newText.trim()) {
      addTask(projectId, phase.id, newText)
      setNewText('')
    }
    setAdding(false)
  }
  const onAddKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitAdd()
    } else if (e.key === 'Escape') {
      setAdding(false)
      setNewText('')
    }
  }

  const onTaskDragEnd = (e: DragEndEvent) => {
    setActiveTaskId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = phase.tasks.map((t) => t.id)
    const from = ids.indexOf(active.id as string)
    const to = ids.indexOf(over.id as string)
    if (from >= 0 && to >= 0) moveTask(projectId, phase.id, from, to)
  }

  return (
    <div className="group bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-soft hover:shadow-card transition-shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-ink-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {(dragListeners || dragAttributes) && (
              <button
                {...dragAttributes}
                {...dragListeners}
                aria-label="ลากเพื่อจัดลำดับ Phase"
                title="ลากเพื่อจัดลำดับ"
                className="shrink-0 w-6 h-11 -ml-1 flex items-center justify-center text-ink-300 hover:text-ink-500 cursor-grab active:cursor-grabbing touch-none"
              >
                <IconGrip width={18} height={18} />
              </button>
            )}
            <div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold ring-1 ${badge}`}
            >
              {state === 'done' ? <IconCheck width={20} height={20} /> : phase.phaseNumber}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-ink-900 truncate">{phase.name}</h3>
              <span className={`inline-flex mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ${badge}`}>
                {label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-ink-800 tabular-nums">
                {completedTasks}
                <span className="text-ink-400 font-medium">/{totalTasks}</span>
              </p>
              <p className="text-[11px] text-ink-400 font-medium">งาน</p>
            </div>
            <ActionMenu
              ariaLabel="ตัวเลือก Phase"
              buttonClassName="w-8 h-8 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
              items={[
                { label: 'แก้ไข Phase', icon: <IconPencil width={16} height={16} />, onClick: onEditPhase },
                { label: 'ลบ Phase', danger: true, icon: <IconTrash width={16} height={16} />, onClick: onDeletePhase },
              ]}
            />
          </div>
        </div>
        <div className="mt-3.5">
          <ProgressBar percentage={percentage} size="sm" />
        </div>
      </div>

      <div className="px-5 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) => setActiveTaskId(e.active.id as string)}
          onDragEnd={onTaskDragEnd}
          onDragCancel={() => setActiveTaskId(null)}
        >
          <SortableContext items={phase.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {phase.tasks.map((task) => (
                <TaskRow key={task.id} task={task} projectId={projectId} phaseId={phase.id} />
              ))}
              {phase.tasks.length === 0 && !adding && (
                <li className="text-sm text-ink-400 italic px-0.5 py-1">ยังไม่มีงานใน Phase นี้</li>
              )}
            </ul>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
            {activeTask ? <TaskGhost task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>

        {adding ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={onAddKey}
              onBlur={commitAdd}
              autoFocus
              placeholder="รายละเอียดงานใหม่…"
              className="flex-1 px-3 py-1.5 rounded-lg bg-ink-50 ring-1 ring-brand-300 focus:ring-2 focus:ring-brand-400 outline-none text-sm text-ink-900 placeholder:text-ink-400"
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitAdd}
              className="shrink-0 w-8 h-8 rounded-lg text-white bg-navy-700 hover:bg-navy-800 flex items-center justify-center"
              aria-label="เพิ่ม"
            >
              <IconPlus width={16} height={16} />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setAdding(false)
                setNewText('')
              }}
              className="shrink-0 w-8 h-8 rounded-lg text-ink-400 hover:bg-ink-100 flex items-center justify-center"
              aria-label="ยกเลิก"
            >
              <IconX width={16} height={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 px-2 py-1.5 -mx-2 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <IconPlus width={16} height={16} />
            เพิ่มงาน
          </button>
        )}
      </div>
    </div>
  )
}
