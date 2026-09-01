import { useMemo, useState } from 'react'
import { Project, Service, ServiceType } from '../types/project'
import { useProjects } from '../store/ProjectStore'
import ActionMenu from './ActionMenu'
import ServiceFormModal from './ServiceFormModal'
import ImportAssetsModal from './ImportAssetsModal'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'
import { IconBalance, IconDatabase, IconBox, IconPlus, IconPencil, IconTrash, IconRows, IconArrowRight } from './Icons'

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

type Row = { label: string; value: string }

const mk = (label: string, value?: string | number): Row | null =>
  value !== undefined && value !== null && String(value).trim() !== '' ? { label, value: String(value) } : null

const clean = (rows: (Row | null)[]): Row[] => rows.filter((r): r is Row => r !== null)

/** ข้อมูลหลักที่โชว์บนการ์ด — รายละเอียดเต็มดูใน popup */
function summaryRowsFor(sv: Service): Row[] {
  if (sv.type === 'Database') {
    return clean([
      mk('Zone', sv.availabilityZone),
      mk('Engine', [sv.engine, sv.version].filter(Boolean).join(' ')),
      mk('Plan', sv.plan),
      mk('Storage', sv.capacityGB ? sv.capacityGB + ' GB' : ''),
    ])
  }
  if (sv.type === 'Object Storage') {
    return clean([
      mk('Bucket', sv.bucket),
      mk('Class', sv.storageClass),
      mk('Quota', sv.capacityGB ? sv.capacityGB + ' GB' : ''),
      mk('Access', sv.access),
    ])
  }
  return clean([
    mk('Zone', sv.availabilityZone),
    mk('Topology', sv.topology),
    mk('Protocol', [sv.protocol, sv.port].filter(Boolean).join(' : ')),
    mk('IP Private', sv.ipPrivate),
  ])
}

/** รายละเอียดเต็มแบบจัดกลุ่มสำหรับ popup */
function detailGroups(sv: Service): { title: string; rows: Row[] }[] {
  let raw: { title: string; rows: (Row | null)[] }[]
  if (sv.type === 'Database') {
    raw = [
      { title: 'ทั่วไป', rows: [mk('Availability Zone', sv.availabilityZone), mk('Engine', sv.engine), mk('Version', sv.version), mk('Plan', sv.plan)] },
      { title: 'Storage', rows: [mk('Storage', sv.capacityGB ? sv.capacityGB + ' GB' : ''), mk('Storage Type', sv.storageType)] },
      { title: 'Network', rows: [mk('IP Private', sv.ipPrivate), mk('IP Public', sv.ipPublic)] },
    ]
  } else if (sv.type === 'Object Storage') {
    raw = [
      { title: 'ทั่วไป', rows: [mk('Bucket', sv.bucket), mk('Storage Class', sv.storageClass), mk('Access', sv.access)] },
      { title: 'Storage', rows: [mk('Quota', sv.capacityGB ? sv.capacityGB + ' GB' : '')] },
      { title: 'Network', rows: [mk('Endpoint', sv.endpoint)] },
    ]
  } else {
    raw = [
      { title: 'ทั่วไป', rows: [mk('Availability Zone', sv.availabilityZone), mk('Topology', sv.topology), mk('Spec', sv.spec)] },
      { title: 'การกระจายโหลด', rows: [mk('Algorithm', sv.algorithm), mk('Protocol', sv.protocol), mk('Port', sv.port), mk('Members', sv.members)] },
      { title: 'Network', rows: [mk('IP Private', sv.ipPrivate), mk('IP Public', sv.ipPublic), mk('Endpoint', sv.endpoint)] },
    ]
  }
  return raw.map((g) => ({ title: g.title, rows: clean(g.rows) })).filter((g) => g.rows.length > 0)
}

export default function ServicePanel({ project, active }: { project: Project; active: boolean }) {
  const { addService, updateService, deleteService } = useProjects()
  const [modal, setModal] = useState<{ open: boolean; service: Service | null }>({ open: false, service: null })
  const [toDelete, setToDelete] = useState<Service | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [filter, setFilter] = useState<ServiceType | 'all'>('all')
  const [detail, setDetail] = useState<Service | null>(null)

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
                    onClick={() => setDetail(sv)}
                    className="h-full flex flex-col rounded-xl ring-1 ring-ink-200/70 bg-white p-4 cursor-pointer hover:shadow-card hover:ring-brand-200 transition-shadow"
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
                      <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          ariaLabel="ตัวเลือก Service"
                          buttonClassName="w-7 h-7 shrink-0 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
                          items={[
                            { label: 'ดูรายละเอียด', icon: <IconArrowRight width={16} height={16} />, onClick: () => setDetail(sv) },
                            { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => setModal({ open: true, service: sv }) },
                            { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setToDelete(sv) },
                          ]}
                        />
                      </div>
                    </div>
                    <dl className="mt-3 pt-3 border-t border-ink-100 space-y-1.5">
                      {summaryRowsFor(sv).map((r, i) => (
                        <div key={i} className="flex justify-between items-baseline gap-3 text-xs">
                          <dt className="text-ink-400 shrink-0">{r.label}</dt>
                          <dd className="text-ink-700 font-medium text-right truncate">{r.value}</dd>
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

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail?.name || 'Service'}
        subtitle="รายละเอียดบริการเสริม (Add-on)"
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${META[detail.type].chip}`}>
                {(() => { const I = META[detail.type].Icon; return <I width={13} height={13} /> })()}
                {detail.type}
              </span>
              {detail.availabilityZone && (
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-ink-100 text-ink-600">
                  {detail.availabilityZone}
                </span>
              )}
              {detail.topology && (
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-ink-100 text-ink-600">
                  {detail.topology}
                </span>
              )}
            </div>

            {detailGroups(detail).map((group, gi) => (
              <div key={gi} className="rounded-xl ring-1 ring-ink-200/70 bg-ink-50/50 p-4">
                <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-2.5">{group.title}</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5">
                  {group.rows.map((r, i) => (
                    <div key={i} className="flex justify-between gap-3 text-sm">
                      <dt className="text-ink-400 shrink-0">{r.label}</dt>
                      <dd className="text-ink-900 font-medium text-right break-words min-w-0">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}

            {detail.note && (
              <div className="rounded-xl ring-1 ring-ink-200/70 bg-ink-50/50 p-4">
                <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5">หมายเหตุ</p>
                <p className="text-sm text-ink-700 leading-relaxed">{detail.note}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDetail(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors"
              >
                ปิด
              </button>
              <button
                onClick={() => { const sv = detail; setDetail(null); setModal({ open: true, service: sv }) }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors"
              >
                <IconPencil width={15} height={15} /> แก้ไข
              </button>
            </div>
          </div>
        )}
      </Modal>

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
