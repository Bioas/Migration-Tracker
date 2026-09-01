import { ProjectStatus } from '../types/project'

const statusConfig: Record<ProjectStatus, { label: string; bg: string; text: string; dot: string; ring: string }> = {
  Active: { label: 'กำลังดำเนินการ', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-200/70' },
  'On Hold': { label: 'พักไว้', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-200/70' },
  Completed: { label: 'เสร็จสมบูรณ์', bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500', ring: 'ring-brand-200/70' },
  Cancelled: { label: 'ยกเลิก', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', ring: 'ring-rose-200/70' },
}

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  )
}
