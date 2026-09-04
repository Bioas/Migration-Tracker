import { useState } from 'react'
import { Project, Asset, assetPolicies } from '../types/project'
import { useProjects } from '../store/ProjectStore'
import ActionMenu from './ActionMenu'
import AssetFormModal from './AssetFormModal'
import ImportAssetsModal from './ImportAssetsModal'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'
import { IconGrid, IconRows, IconPlus, IconPencil, IconTrash, IconArrowRight } from './Icons'

/** สรุป data disk เป็นข้อความ: หลายลูกโชว์แยก "100 + 200 GB", ลูกเดียว/ค่าเก่าโชว์รวม */
function dataDiskLabel(a: Asset): string {
  const disks = (a.dataDisks ?? []).filter((d) => d > 0)
  if (disks.length > 1) return disks.join(' + ') + ' GB'
  if (disks.length === 1) return disks[0] + ' GB'
  return a.dataDiskGB ? a.dataDiskGB + ' GB' : ''
}

/** ช่อง Disk ในตาราง: OS disk + data disk (ถ้ามี) */
function diskCell(a: Asset): string {
  const parts: string[] = []
  if (a.osDiskGB) parts.push(`OS ${a.osDiskGB}GB`)
  const data = dataDiskLabel(a)
  if (data) parts.push(`Data ${data}`)
  return parts.length ? parts.join(' · ') : '—'
}

function detailGroups(a: Asset): { title: string; rows: { label: string; value: string }[] }[] {
  const mk = (label: string, value?: string | number) =>
    value !== undefined && value !== null && String(value).trim() !== ''
      ? { label, value: String(value) }
      : null
  const raw = [
    {
      title: 'ข้อมูลเครื่อง',
      rows: [mk('Type', a.role), mk('Service', a.service), mk('License', a.license), mk('ต้นทาง', a.source), mk('OS', a.os), mk('Machine Type', a.machineType)],
    },
    {
      title: 'Compute & Storage',
      rows: [mk('vCPU', a.vcpu), mk('RAM', a.ramGB ? a.ramGB + ' GB' : ''), mk('Storage Type', a.storageType), mk('OS Disk', a.osDiskGB ? a.osDiskGB + ' GB' : ''), mk('Data Disk', dataDiskLabel(a))],
    },
    {
      title: 'Network',
      rows: [mk('IP Private', a.ipAddress), mk('Subnet mask', a.subnetMask), mk('IP Public', a.ipPublic), mk('Domain', a.domain)],
    },
  ]
  return raw
    .map((g) => ({ title: g.title, rows: g.rows.filter((x): x is { label: string; value: string } => x !== null) }))
    .filter((g) => g.rows.length > 0)
}

export default function AssetPanel({ project, active }: { project: Project; active: boolean }) {
  const { addAsset, updateAsset, deleteAsset } = useProjects()
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [modal, setModal] = useState<{ open: boolean; asset: Asset | null }>({ open: false, asset: null })
  const [toDelete, setToDelete] = useState<Asset | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [detail, setDetail] = useState<Asset | null>(null)

  const assets = project.assets ?? []

  const menuItems = (a: Asset) => [
    { label: 'ดูรายละเอียด', icon: <IconArrowRight width={16} height={16} />, onClick: () => setDetail(a) },
    { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => setModal({ open: true, asset: a }) },
    { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setToDelete(a) },
  ]

  const toggleBtn = (v: 'table' | 'cards', Icon: typeof IconRows, title: string) => (
    <button
      onClick={() => setView(v)}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        view === v ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-400 hover:text-ink-700'
      }`}
    >
      <Icon width={17} height={17} />
    </button>
  )

  return (
    <div className={active ? '' : 'hidden'}>
      <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <IconGrid width={19} height={19} className="text-brand-600" />
            <h2 className="text-lg font-bold text-ink-900">VMs</h2>
            <span className="text-xs font-semibold text-ink-400 tabular-nums">{assets.length} เครื่อง</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-ink-100/70 ring-1 ring-ink-200/60">
              {toggleBtn('table', IconRows, 'มุมมองตาราง')}
              {toggleBtn('cards', IconGrid, 'มุมมองการ์ด')}
            </div>
            <ActionMenu
              ariaLabel="เพิ่ม VM"
              icon={IconPlus}
              label="เพิ่ม VM"
              buttonClassName="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-3.5 py-2 rounded-xl transition-colors"
              items={[
                { label: 'เพิ่ม VM ใหม่', icon: <IconPlus width={16} height={16} />, onClick: () => setModal({ open: true, asset: null }) },
                { label: 'นำเข้าจาก Excel / CSV', icon: <IconRows width={16} height={16} />, onClick: () => setImportOpen(true) },
              ]}
            />
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-ink-500 mb-3">ยังไม่มี VMs ในโปรเจกต์นี้</p>
            <button onClick={() => setModal({ open: true, asset: null })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
              <IconPlus width={16} height={16} /> เพิ่ม VM แรก
            </button>
          </div>
        ) : view === 'table' ? (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50/60 text-ink-500">
                  <th className="text-left py-3 px-6 font-semibold whitespace-nowrap sticky left-0 z-10 bg-[#fbfcfd] shadow-[inset_-1px_0_0_#f1f5f9,4px_0_8px_-6px_rgba(15,23,42,0.10)]">ชื่อ / Hostname</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Type</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Service</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">ต้นทาง</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">OS</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Spec</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Disk</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">IP Private</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Public / Domain</th>
                  <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Network Policy</th>
                  <th className="text-right py-3 px-6 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {assets.map((a) => (
                  <tr key={a.id} onClick={() => setDetail(a)} className="hover:bg-brand-50/40 cursor-pointer transition-colors group/row">
                    <td className="py-3 px-6 font-semibold text-ink-900 whitespace-nowrap sticky left-0 z-10 bg-white group-hover/row:bg-[#fef7fb] transition-colors shadow-[inset_-1px_0_0_#f1f5f9,4px_0_8px_-6px_rgba(15,23,42,0.10)]">{a.name}</td>
                    <td className="py-3 px-3 text-ink-600 whitespace-nowrap">{a.role}</td>
                    <td className="py-3 px-3 text-ink-600 whitespace-nowrap">{a.service || '—'}</td>
                    <td className="py-3 px-3 text-ink-600 whitespace-nowrap">{a.source}</td>
                    <td className="py-3 px-3 text-ink-600 whitespace-nowrap">{a.os || '—'}</td>
                    <td className="py-3 px-3 text-ink-600 whitespace-nowrap tabular-nums">{a.vcpu} vCPU · {a.ramGB}GB</td>
                    <td className="py-3 px-3 text-ink-600 whitespace-nowrap tabular-nums">{diskCell(a)}</td>
                    <td className="py-3 px-3 text-ink-500 tabular-nums whitespace-nowrap">{a.ipAddress || '—'}</td>
                    <td className="py-3 px-3 text-ink-500 whitespace-nowrap">{a.ipPublic || a.domain || '—'}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {(() => {
                        const rules = assetPolicies(a)
                        if (rules.length === 0) return <span className="text-ink-400">—</span>
                        return (
                          <div className="space-y-0.5">
                            {rules.slice(0, 2).map((r, i) => (
                              <div key={i} className="text-xs text-ink-600 tabular-nums">
                                <span className="font-semibold text-ink-700">{r.port || '—'}</span>
                                <span className="text-ink-400"> · </span>
                                {r.source || '—'}
                                <span className="text-ink-400"> → </span>
                                {r.destination || '—'}
                              </div>
                            ))}
                            {rules.length > 2 && (
                              <span className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-navy-100 text-navy-700 tabular-nums">
                                +{rules.length - 2} เพิ่มเติม
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <ActionMenu ariaLabel="ตัวเลือก VM" buttonClassName="w-7 h-7 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors" items={menuItems(a)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assets.map((a) => (
              <div
                key={a.id}
                onClick={() => setDetail(a)}
                className="rounded-xl ring-1 ring-ink-200/70 bg-white p-4 hover:shadow-card hover:ring-brand-200 cursor-pointer transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-ink-900 truncate">{a.name}</h4>
                    <span className="inline-flex mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-ink-100 text-ink-600 ring-1 ring-ink-200">{a.role}</span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActionMenu ariaLabel="ตัวเลือก VM" buttonClassName="w-7 h-7 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors" items={menuItems(a)} />
                  </div>
                </div>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-3"><dt className="text-ink-400 shrink-0">OS</dt><dd className="text-ink-700 font-medium truncate text-right">{a.os || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-400 shrink-0">Spec</dt><dd className="text-ink-700 font-medium truncate text-right tabular-nums">{a.vcpu}vCPU · {a.ramGB}GB</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-400 shrink-0">Disk</dt><dd className="text-ink-700 font-medium truncate text-right tabular-nums">{diskCell(a)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-400 shrink-0">IP Private</dt><dd className="text-ink-700 font-medium truncate text-right tabular-nums">{a.ipAddress || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-400 shrink-0">Policy</dt><dd className="text-ink-700 font-medium truncate text-right">{(() => { const rules = assetPolicies(a); if (rules.length === 0) return '—'; const first = rules[0]; const label = `${first.port || '—'} · ${first.source || '—'} → ${first.destination || '—'}`; return rules.length > 1 ? `${label} +${rules.length - 1}` : label })()}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} wide title={detail?.name || 'VM'} subtitle="รายละเอียดเครื่อง (VM)">
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200/70">{detail.role}</span>
              <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-ink-100 text-ink-600">{detail.source}</span>
              {detail.os && (
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-ink-100 text-ink-600">{detail.os}</span>
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
            {assetPolicies(detail).length > 0 && (
              <div className="rounded-xl ring-1 ring-ink-200/70 bg-ink-50/50 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Network Policy</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-navy-100 text-navy-700 tabular-nums">
                    {assetPolicies(detail).length} rule{assetPolicies(detail).length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto scrollbar-thin rounded-lg ring-1 ring-ink-200/70 bg-white">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-ink-50 text-ink-500">
                      <tr>
                        <th className="text-left py-2 px-3 font-semibold">Port</th>
                        <th className="text-left py-2 px-3 font-semibold">Source</th>
                        <th className="text-left py-2 px-3 font-semibold">Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {assetPolicies(detail).map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-semibold text-ink-800 tabular-nums whitespace-nowrap">{r.port || '—'}</td>
                          <td className="py-2 px-3 text-ink-600 tabular-nums break-all">{r.source || '—'}</td>
                          <td className="py-2 px-3 text-ink-600 tabular-nums break-all">{r.destination || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                onClick={() => { const a = detail; setDetail(null); setModal({ open: true, asset: a }) }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors"
              >
                <IconPencil width={15} height={15} /> แก้ไข
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AssetFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, asset: null })}
        initial={modal.asset}
        onSubmit={(data) => {
          if (modal.asset) updateAsset(project.id, modal.asset.id, data)
          else addAsset(project.id, data)
        }}
      />
      <ImportAssetsModal open={importOpen} onClose={() => setImportOpen(false)} project={project} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteAsset(project.id, toDelete.id)}
        title="ลบ VM"
        message={`ต้องการลบ "${toDelete?.name}" ออกจาก inventory ใช่หรือไม่?`}
        confirmLabel="ลบ VM"
      />
    </div>
  )
}
