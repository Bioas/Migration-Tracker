import { useState } from 'react'
import { Project, Service, ServiceType } from '../types/project'
import { useProjects } from '../store/ProjectStore'
import ActionMenu from './ActionMenu'
import ServiceFormModal from './ServiceFormModal'
import ImportAssetsModal from './ImportAssetsModal'
import ConfirmDialog from './ConfirmDialog'
import { IconBalance, IconDatabase, IconBox, IconPlus, IconPencil, IconTrash, IconRows } from './Icons'

const META: Record<ServiceType, { Icon: typeof IconBalance; tint: string }> = {
  'Load Balancer': { Icon: IconBalance, tint: 'from-brand-500 to-brand-700' },
  Database: { Icon: IconDatabase, tint: 'from-navy-500 to-navy-700' },
  'Object Storage': { Icon: IconBox, tint: 'from-teal-500 to-emerald-600' },
}
const ORDER: ServiceType[] = ['Load Balancer', 'Database', 'Object Storage']

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

  const services = project.services ?? []

  return (
    <div className={active ? '' : 'hidden'}>
      <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
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
          <div className="space-y-6">
            {ORDER.map((type) => {
              const items = services.filter((s) => s.type === type)
              if (!items.length) return null
              const { Icon } = META[type]
              return (
                <section key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon width={16} height={16} className="text-ink-500" />
                    <h3 className="text-sm font-bold text-ink-700">{type}</h3>
                    <span className="text-[11px] font-semibold text-ink-400 tabular-nums">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map((sv) => {
                      const { Icon: SvIcon, tint } = META[sv.type]
                      return (
                        <div key={sv.id} className="rounded-xl ring-1 ring-ink-200/70 bg-white p-4 hover:shadow-card transition-shadow">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br ${tint} text-white flex items-center justify-center shadow-soft`}>
                                <SvIcon width={18} height={18} />
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-ink-900 truncate">{sv.name}</h4>
                                <p className="text-[11px] text-ink-400">{sv.type}</p>
                              </div>
                            </div>
                            <ActionMenu
                              ariaLabel="ตัวเลือก Service"
                              buttonClassName="w-7 h-7 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
                              items={[
                                { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => setModal({ open: true, service: sv }) },
                                { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setToDelete(sv) },
                              ]}
                            />
                          </div>
                          <dl className="mt-3 space-y-1">
                            {rowsFor(sv).map((r, i) => (
                              <div key={i} className="flex justify-between gap-3 text-xs">
                                <dt className="text-ink-400 shrink-0">{r.label}</dt>
                                <dd className="text-ink-700 font-medium truncate text-right">{r.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
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
