import { useMemo, useState } from 'react'
import { Project, Service, ServiceType } from '../types/project'
import { useProjects } from '../store/ProjectStore'
import ActionMenu from './ActionMenu'
import ServiceFormModal from './ServiceFormModal'
import ImportAssetsModal from './ImportAssetsModal'
import ConfirmDialog from './ConfirmDialog'
import { IconBalance, IconDatabase, IconBox, IconPlus, IconPencil, IconTrash, IconRows } from './Icons'

const META: Record<ServiceType, { Icon: typeof IconBalance; tint: string; chip: string }> = {
  'Load Balancer': {
    Icon: IconBalance,
    tint: 'from-brand-500 to-brand-700',
    chip: 'bg-brand-50 text-brand-700 ring-brand-200/70',
  },
  Database: {
    Icon: IconDatabase,
    tint: 'from-navy-500 to-navy-700',
    chip: 'bg-navy-50 text-navy-700 ring-navy-200/70',
  },
  'Object Storage': {
    Icon: IconBox,
    tint: 'from-teal-500 to-emerald-600',
    chip: 'bg-teal-50 text-teal-700 ring-teal-200/70',
  },
}
const ORDER: ServiceType[] = ['Load Balancer', 'Database', 'Object Storage']

/** ค่าที่ยาวและควรขึ้นบรรทัดใหม่แทนการตัดข้อความ */
const WRAP_LABELS = new Set(['Members', 'Endpoint', 'Bucket'])

function rowsFor(sv: Service): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  const push = (label: string, value?: string | number) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') rows.push({ label, value: String(value) })
  }
  if (sv.type === 'Load Balancer') {
    push('Zone', sv.availabilityZone)
    push('Topology', sv.topology)
    push('Spec', sv.spec)
    push('Algorithm', sv.algorithm)
    push('Protocol', [sv.protocol, sv.port].filter(Boolean).join(' : '))
    push('Members', sv.members)
    push('IP Private', sv.ipPrivate)
    push('IP Public', sv.ipPublic)
  } else if (sv.type === 'Database') {
    push('Zone', sv.availabilityZone)
    push('Engine', [sv.engine, sv.version].filter(Boolean).join(' '))
    push('Plan', sv.plan)
    push('Storage', sv.capacityGB ? `${sv.capacityGB} GB` : '')
    push('Storage Type', sv.storageType)
    push('IP Private', sv.ipPrivate)
    push('IP Public', sv.ipPublic)
  } else {
    push('Bucket', sv.bucket)
    push('Class', sv.storageClass)
    push('Quota', sv.capacityGB ? `${sv.capacityGB} GB` : '')
    push('Access', sv.access)
  }
  if (sv.type !== 'Database') push('Endpoint', sv.endpoint)
  return rows
}

export default function ServicePanel({ project, active }: { project: Project; active: boolean }) {
  const { addService, updateService, deleteService } = useProjects()
  const [modal, setModal] = useState<{ open: boolean; service: Service | null }>({ open: false, service: null })
  const [toDelete, setToDelete] = useState<Service | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [filter, setFilter] = useState<ServiceType | 'all'>('all')

  const services = project.services ?? []

  const countOf = (t: ServiceType) => services.filter((s) => s.type === t).length

  // เรียงตามประเภทเสมอ เพื่อให้การ์ดประเภทเดียวกันอยู่ติดกันแม้ไม่ได้แบ่ง section
  const visible = useMemo(() => {
    const list = filter === 'all' ? services : services.filter((s) => s.type === filter)
    return [...list].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
  }, [services, filter])

  const chipCls = (on: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition-all ${
      on ? 'bg-navy-700 text-white ring-navy-700 shadow-soft' : 'bg-white text-ink-600 ring-ink-200 hover:ring-ink-300 hover:bg-ink-50'
    }`

  return (
    <div className={active ? '' : 'hidden'}>
      <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <IconBalance width={19} height={19} className="text-brand-600" />
            <h2 className="text-lg font-bold text-ink-900">Service (Add-on)</h2>
            <span className="text-xs font-semibold text-ink-400 tabular-nums">{services.length} รายการ</span>
          </div>
          <ActionMenu
            ariaLabel="เพิ่ม Service"
            icon={IconPlus}
            label="เพิ่ม Service"
            buttonClassName="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-3.5 py-2 rounded-xl transition-colors"
            items={[
              { label: 'เพิ่ม Service ใหม่', icon: <IconPlus width={16} height={16} />, onClick: () => setModal({ open: true, service: null }) },
              { label: 'นำเข้าจาก Excel / CSV', icon: <IconRows width={16} height={16} />, onClick: () => setImportOpen(true) },
            ]}
          />
        </div>

        {services.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-ink-500 mb-3">ยังไม่มี Service ในโปรเจกต์นี้</p>
            <button onClick={() => setModal({ open: true, service: null })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
              <IconPlus width={16} height={16} /> เพิ่ม Service แรก
            </button>
          </div>
        ) : (
          <>
            {/* ตัวกรองตามประเภท — แทนการแบ่ง section ที่ทำให้การ์ดเหลือแถวละใบ */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              <button type="button" onClick={() => setFilter('all')} className={chipCls(filter === 'all')}>
                ทั้งหมด
                <span className="tabular-nums opacity-70">{services.length}</span>
              </button>
              {ORDER.map((t) => {
                const n = countOf(t)
                if (!n) return null
                const { Icon } = META[t]
                return (
                  <button key={t} type="button" onClick={() => setFilter(t)} className={chipCls(filter === t)}>
                    <Icon width={14} height={14} />
                    {t}
                    <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((sv) => {
                const { Icon: SvIcon, tint, chip } = META[sv.type]
                return (
                  <div
                    key={sv.id}
                    className="h-full flex flex-col rounded-xl ring-1 ring-ink-200/70 bg-white p-4 hover:shadow-card hover:ring-brand-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br ${tint} text-white flex items-center justify-center shadow-soft`}>
                          <SvIcon width={18} height={18} />
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-ink-900 truncate">{sv.name}</h4>
                          <span className={`inline-flex mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ${chip}`}>
                            {sv.type}
                          </span>
                        </div>
                      </div>
                      <ActionMenu
                        ariaLabel="ตัวเลือก Service"
                        buttonClassName="w-7 h-7 shrink-0 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
                        items={[
                          { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => setModal({ open: true, service: sv }) },
                          { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setToDelete(sv) },
                        ]}
                      />
                    </div>
                    <dl className="mt-3 pt-3 border-t border-ink-100 space-y-1.5">
                      {rowsFor(sv).map((r, i) => (
                        <div key={i} className="flex justify-between items-baseline gap-3 text-xs">
                          <dt className="text-ink-400 shrink-0">{r.label}</dt>
                          <dd
                            className={`text-ink-700 font-medium text-right min-w-0 ${
                              WRAP_LABELS.has(r.label) ? 'break-words' : 'truncate'
                            }`}
                          >
                            {r.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ServiceFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, service: null })}
        initial={modal.service}
        onSubmit={(data) => {
          if (modal.service) updateService(project.id, modal.service.id, data)
          else addService(project.id, data)
        }}
      />
      <ImportAssetsModal open={importOpen} onClose={() => setImportOpen(false)} project={project} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteService(project.id, toDelete.id)}
        title="ลบ Service"
        message={`ต้องการลบ "${toDelete?.name}" ออกจากโปรเจกต์ใช่หรือไม่?`}
        confirmLabel="ลบ Service"
      />
    </div>
  )
}
