import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import Modal from './Modal'
import { Project } from '../types/project'
import { useProjects } from '../store/ProjectStore'
import {
  parseWorkbookFile,
  downloadWorkbookTemplate,
  type SheetResult,
  applyAiMapping,
} from '../lib/workbookImport'
import { classifySheetWithAI, aiClassifyConfigured } from '../lib/aiSheetClassify'
import { IconGrid, IconArrowRight, IconCheck, IconX, IconLayers, IconRows, IconBalance, IconBolt } from './Icons'

const kindBadge = (s: SheetResult) => {
  if (s.kind === 'vm') {
    const ok = s.vm!.rows.filter((r) => r.errors.length === 0).length
    return { label: `VM · ${ok} แถว`, cls: 'bg-brand-50 text-brand-700 ring-brand-200/70' }
  }
  if (s.kind === 'service') {
    const ok = s.service!.rows.filter((r) => r.errors.length === 0).length
    return { label: `Service · ${ok} แถว`, cls: 'bg-teal-50 text-teal-700 ring-teal-200/70' }
  }
  return { label: 'ข้าม', cls: 'bg-ink-100 text-ink-500 ring-ink-200' }
}

export default function ImportAssetsModal({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project: Project
}) {
  const { importAssets, importServices } = useProjects()
  const fileRef = useRef<HTMLInputElement>(null)
  const [sheets, setSheets] = useState<SheetResult[]>([])
  const [include, setInclude] = useState<Record<number, boolean>>({})
  const [preview, setPreview] = useState<number>(-1)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [aiBusy, setAiBusy] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!open) return
    setSheets([])
    setInclude({})
    setPreview(-1)
    setFileName('')
    setError(null)
    setMode('append')
    setAiBusy({})
  }, [open])

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting same file
    if (!file) return
    setParsing(true)
    setError(null)
    setFileName(file.name)
    try {
      const res = await parseWorkbookFile(file)
      setSheets(res.sheets)
      const inc: Record<number, boolean> = {}
      res.sheets.forEach((s, i) => { inc[i] = s.kind !== 'skipped' })
      setInclude(inc)
      const firstUseful = res.sheets.findIndex((s) => s.kind !== 'skipped')
      setPreview(firstUseful)
      if (firstUseful < 0) {
        setError('ไม่พบ sheet ที่มีตาราง VM หรือ Service ที่รู้จัก — ตรวจหัวตาราง เช่น VMName, vCPU หรือ Service Name, Engine (ดาวน์โหลดเทมเพลตเพื่อดูรูปแบบ)')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ')
      setSheets([])
    } finally {
      setParsing(false)
    }
  }

  const aiClassify = async (i: number) => {
    const sheet = sheets[i]
    if (!sheet?.matrix) return
    setAiBusy((m) => ({ ...m, [i]: true }))
    setError(null)
    try {
      const ai = await classifySheetWithAI(sheet.name, sheet.matrix)
      const updated = applyAiMapping(sheet.name, sheet.matrix, ai)
      setSheets((list) => list.map((s2, j) => (j === i ? updated : s2)))
      if (updated.kind !== 'skipped') {
        setInclude((m) => ({ ...m, [i]: true }))
        setPreview(i)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เรียก AI ไม่สำเร็จ')
    } finally {
      setAiBusy((m) => ({ ...m, [i]: false }))
    }
  }

  const totals = useMemo(() => {
    let vms = 0, services = 0, errored = 0, warned = 0
    sheets.forEach((s, i) => {
      if (!include[i]) return
      if (s.kind === 'vm') {
        for (const r of s.vm!.rows) {
          if (r.errors.length) errored++
          else { vms++; if (r.warnings.length) warned++ }
        }
      } else if (s.kind === 'service') {
        for (const r of s.service!.rows) {
          if (r.errors.length) errored++
          else { services++; if (r.warnings.length) warned++ }
        }
      }
    })
    return { vms, services, errored, warned }
  }, [sheets, include])

  const doImport = () => {
    if (totals.vms + totals.services === 0) return
    const assets = sheets.flatMap((s, i) =>
      include[i] && s.kind === 'vm' ? s.vm!.rows.filter((r) => r.errors.length === 0).map((r) => r.asset) : []
    )
    const services = sheets.flatMap((s, i) =>
      include[i] && s.kind === 'service' ? s.service!.rows.filter((r) => r.errors.length === 0).map((r) => r.service) : []
    )
    if (assets.length || mode === 'replace') importAssets(project.id, assets, mode)
    if (services.length || mode === 'replace') importServices(project.id, services, mode)
    onClose()
  }

  const active = preview >= 0 ? sheets[preview] : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="นำเข้าข้อมูลจาก Excel / CSV"
      subtitle={`${project.projectName} — รองรับไฟล์หลาย sheet (List VM / Service) ระบบจำแนกให้อัตโนมัติ`}
    >
      <div className="space-y-4">
        {/* File controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-4 py-2 rounded-xl transition-colors"
          >
            <IconGrid width={16} height={16} /> เลือกไฟล์ (.xlsx / .csv)
          </button>
          <button
            onClick={() => downloadWorkbookTemplate()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 ring-1 ring-brand-200/70 px-3.5 py-2 rounded-xl transition-colors"
          >
            <IconArrowRight width={15} height={15} className="rotate-90" /> ดาวน์โหลดเทมเพลต Excel
          </button>
          {fileName && <span className="text-xs text-ink-500 truncate">{fileName}</span>}
        </div>

        {parsing && <p className="text-sm text-ink-500">กำลังอ่านไฟล์…</p>}
        {error && <p className="text-sm text-rose-600 bg-rose-50 ring-1 ring-rose-200 rounded-xl p-3">{error}</p>}

        {/* Sheet list */}
        {sheets.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wider">Sheet ในไฟล์ ({sheets.length})</p>
            {sheets.map((s, i) => {
              const badge = kindBadge(s)
              const importable = s.kind !== 'skipped'
              return (
                <div
                  key={i}
                  onClick={() => importable && setPreview(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 transition-all ${
                    importable ? 'cursor-pointer' : 'opacity-70'
                  } ${preview === i ? 'ring-brand-300 bg-brand-50/40' : 'ring-ink-200/70 bg-white hover:ring-ink-300'}`}
                >
                  {importable ? (
                    <input
                      type="checkbox"
                      checked={!!include[i]}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setInclude((m) => ({ ...m, [i]: e.target.checked }))}
                      className="w-4 h-4 accent-[#232152] shrink-0"
                    />
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  {s.kind === 'vm' ? <IconRows width={16} height={16} className="text-brand-600 shrink-0" /> : s.kind === 'service' ? <IconBalance width={16} height={16} className="text-teal-600 shrink-0" /> : <IconX width={14} height={14} className="text-ink-300 shrink-0" />}
                  <span className="font-semibold text-sm text-ink-900 truncate">{s.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 shrink-0 ${badge.cls}`}>{badge.label}</span>
                  <span className="text-xs text-ink-400 truncate hidden sm:inline flex-1 text-right">{s.reason}</span>
                  {!importable && aiClassifyConfigured() && (
                    <button
                      onClick={(e) => { e.stopPropagation(); aiClassify(i) }}
                      disabled={!!aiBusy[i]}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 ring-1 ring-brand-200/70 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60"
                    >
                      <IconBolt width={13} height={13} /> {aiBusy[i] ? 'กำลังวิเคราะห์…' : 'ให้ AI จำแนก'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Preview of selected sheet */}
        {active && active.kind === 'vm' && (
          <div className="rounded-xl ring-1 ring-ink-200/70 overflow-hidden">
            <div className="max-h-[34vh] overflow-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-50 text-ink-500">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-semibold">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold">VMName</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Type</th>
                    <th className="text-left py-2.5 px-3 font-semibold">OS</th>
                    <th className="text-left py-2.5 px-3 font-semibold whitespace-nowrap">vCPU/RAM</th>
                    <th className="text-left py-2.5 px-3 font-semibold">IP</th>
                    <th className="text-left py-2.5 px-3 font-semibold">ผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {active.vm!.rows.map((r) => {
                    const bad = r.errors.length > 0
                    const warn = !bad && r.warnings.length > 0
                    return (
                      <tr key={r.index} className={bad ? 'bg-rose-50/40' : ''}>
                        <td className="py-2 px-3 text-ink-400 tabular-nums">{r.index}</td>
                        <td className="py-2 px-3 font-medium text-ink-900 whitespace-nowrap">{r.asset.name || '—'}</td>
                        <td className="py-2 px-3 text-ink-600 whitespace-nowrap">{r.asset.role}</td>
                        <td className="py-2 px-3 text-ink-600">{r.asset.os || '—'}</td>
                        <td className="py-2 px-3 text-ink-600 tabular-nums whitespace-nowrap">{r.asset.vcpu}/{r.asset.ramGB}GB</td>
                        <td className="py-2 px-3 text-ink-500 tabular-nums whitespace-nowrap">{r.asset.ipAddress || '—'}</td>
                        <td className="py-2 px-3">
                          {bad ? (
                            <span className="text-rose-600 text-xs" title={r.errors.join(', ')}>ผิดพลาด</span>
                          ) : warn ? (
                            <span className="text-amber-600 text-xs" title={r.warnings.join(', ')}>เตือน</span>
                          ) : (
                            <span className="text-emerald-600 text-xs">พร้อม</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active && active.kind === 'service' && (
          <div className="rounded-xl ring-1 ring-ink-200/70 overflow-hidden">
            <div className="max-h-[34vh] overflow-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-50 text-ink-500">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-semibold">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Service</th>
                    <th className="text-left py-2.5 px-3 font-semibold">ประเภท</th>
                    <th className="text-left py-2.5 px-3 font-semibold">รายละเอียด</th>
                    <th className="text-left py-2.5 px-3 font-semibold">ผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {active.service!.rows.map((r) => {
                    const bad = r.errors.length > 0
                    const warn = !bad && r.warnings.length > 0
                    const sv = r.service
                    const detail = sv.type === 'Database'
                      ? [sv.engine, sv.version, sv.plan].filter(Boolean).join(' · ')
                      : sv.type === 'Object Storage'
                        ? [sv.bucket, sv.storageClass].filter(Boolean).join(' · ')
                        : [sv.topology, sv.protocol, sv.port && 'port ' + sv.port].filter(Boolean).join(' · ')
                    return (
                      <tr key={r.index} className={bad ? 'bg-rose-50/40' : ''}>
                        <td className="py-2 px-3 text-ink-400 tabular-nums">{r.index}</td>
                        <td className="py-2 px-3 font-medium text-ink-900 whitespace-nowrap">{sv.name || '—'}</td>
                        <td className="py-2 px-3 text-ink-600 whitespace-nowrap">{sv.type}</td>
                        <td className="py-2 px-3 text-ink-600">{detail || '—'}</td>
                        <td className="py-2 px-3">
                          {bad ? (
                            <span className="text-rose-600 text-xs" title={r.errors.join(', ')}>ผิดพลาด</span>
                          ) : warn ? (
                            <span className="text-amber-600 text-xs" title={r.warnings.join(', ')}>เตือน</span>
                          ) : (
                            <span className="text-emerald-600 text-xs">พร้อม</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary + import */}
        {sheets.length > 0 && (
          <div className="rounded-xl ring-1 ring-ink-200/70 bg-ink-50/50 p-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-emerald-600 inline-flex items-center gap-1"><IconCheck width={14} height={14} /> พร้อมนำเข้า: <b>{totals.vms}</b> VM · <b>{totals.services}</b> Service</span>
            {totals.warned > 0 && <span className="text-amber-600">⚠ เตือน {totals.warned}</span>}
            {totals.errored > 0 && <span className="text-rose-600 inline-flex items-center gap-1"><IconX width={13} height={13} /> ข้ามแถวผิดพลาด {totals.errored}</span>}
          </div>
        )}

        {totals.vms + totals.services > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-ink-100/70 ring-1 ring-ink-200/60">
              <button
                onClick={() => setMode('append')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'append' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-500'}`}
              >
                เพิ่มต่อท้าย
              </button>
              <button
                onClick={() => setMode('replace')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'replace' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-500'}`}
              >
                แทนที่ทั้งหมด
              </button>
            </div>
            <button
              onClick={doImport}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-5 py-2 rounded-xl transition-colors"
            >
              <IconLayers width={16} height={16} /> นำเข้า {totals.vms > 0 ? `${totals.vms} VM` : ''}{totals.vms > 0 && totals.services > 0 ? ' + ' : ''}{totals.services > 0 ? `${totals.services} Service` : ''}
            </button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors">
            ปิด
          </button>
        </div>
      </div>
    </Modal>
  )
}
