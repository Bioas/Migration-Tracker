import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { Project } from '../types/project'
import { analyzeProject, type CheckResult, type CheckCategory } from '../lib/requirementCheck'
import { aiEndpointConfigured, checkWithAI, type AiCheckResponse } from '../lib/aiRequirementCheck'
import { exportCheckReport } from '../lib/checkExport'
import { IconCheck, IconClipboard, IconCheckCircle, IconLayers, IconGrid, IconBalance, IconPencil, IconX, IconArrowRight } from './Icons'

const CATS: CheckCategory[] = ['VMs', 'Service']
const CAT_ICON = { VMs: IconGrid, Service: IconBalance } as const

function scoreTone(score: number) {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 60) return 'text-brand-600'
  return 'text-rose-600'
}

export default function RequirementCheckModal({
  open,
  onClose,
  project,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  project: Project
  onEdit?: (category: CheckCategory, id: string) => void
}) {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [ai, setAi] = useState<AiCheckResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  // ตรวจจากข้อมูล VMs / Service ในระบบทันทีที่เปิด
  useEffect(() => {
    if (!open) return
    setResult(analyzeProject(project))
    setAi(null)
    setAiError(null)
    setCopied(false)
  }, [open, project])

  const runAI = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      setAi(await checkWithAI(project))
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setAiLoading(false)
    }
  }

  const doExport = async () => {
    if (!result) return
    setExporting(true)
    try {
      await exportCheckReport(project, result, ai)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'สร้างไฟล์ไม่สำเร็จ')
    } finally {
      setExporting(false)
    }
  }

  const questions = ai?.questions ?? result?.questions ?? []

  const copyQuestions = async () => {
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  const grouped = useMemo(() => {
    const g: Record<CheckCategory, CheckResult['gaps']> = { VMs: [], Service: [] }
    result?.gaps.forEach((x) => g[x.category].push(x))
    return g
  }, [result])

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="ตรวจสอบความครบถ้วนของข้อมูล"
      subtitle={`${project.projectName} — ตรวจจากข้อมูล VMs และ Service ในระบบ`}
    >
      <div className="space-y-4">
        {result && (
          <>
            {/* Score */}
            <div className="rounded-2xl ring-1 ring-ink-200/70 bg-ink-50/50 p-4 flex items-center gap-4">
              <div className="shrink-0 text-center">
                <p className={`text-3xl font-extrabold tabular-nums ${scoreTone(ai ? ai.score : result.score)}`}>
                  {ai ? ai.score : result.score}%
                </p>
                <p className="text-[11px] text-ink-500 font-medium">ความครบถ้วน</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2.5 rounded-full bg-ink-200/70 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-gradient transition-all duration-700"
                    style={{ width: `${ai ? ai.score : result.score}%` }}
                  />
                </div>
                <p className="text-sm text-ink-600 mt-2">
                  {ai
                    ? ai.summary
                    : result.totalFields === 0
                      ? 'ยังไม่มีข้อมูล VMs หรือ Service ในโปรเจกต์นี้'
                      : `กรอกแล้ว ${result.filledFields}/${result.totalFields} ช่อง — VM ครบ ${result.completeVms}/${result.vmCount} เครื่อง · Service ครบ ${result.completeServices}/${result.serviceCount} รายการ${result.conflicts.length ? ` · พบข้อมูลขัดแย้ง ${result.conflicts.length} รายการ` : ''}`}
                </p>
              </div>
            </div>

            {/* รายการที่ข้อมูลยังไม่ครบ (rule-based) */}
            {!ai && (
              <div className="space-y-3">
                {CATS.map((cat) => {
                  const list = grouped[cat]
                  const Icon = CAT_ICON[cat]
                  const totalOfCat = cat === 'VMs' ? result.vmCount : result.serviceCount
                  const completeOfCat = cat === 'VMs' ? result.completeVms : result.completeServices
                  if (totalOfCat === 0) return null
                  return (
                    <div key={cat} className="rounded-xl ring-1 ring-ink-200/70 bg-white p-3.5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <Icon width={16} height={16} className="text-brand-600" />
                        <p className="text-sm font-bold text-ink-900">{cat}</p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            list.length === 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          ครบ {completeOfCat}/{totalOfCat}
                        </span>
                      </div>
                      {list.length === 0 ? (
                        <p className="text-sm text-emerald-600 inline-flex items-center gap-1.5">
                          <IconCheck width={14} height={14} /> ข้อมูลครบทุกรายการ
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {list.map((g) => (
                            <li key={g.key}>
                              <button
                                type="button"
                                onClick={() => onEdit?.(g.category, g.id)}
                                disabled={!onEdit}
                                title={onEdit ? 'กดเพื่อแก้ไข ' + g.name : undefined}
                                className={`w-full text-left text-sm rounded-lg -mx-1.5 px-1.5 py-1 transition-colors ${
                                  onEdit ? 'cursor-pointer hover:bg-brand-50/60 group/gap' : 'cursor-default'
                                }`}
                              >
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <span className="font-semibold text-ink-900">{g.name}</span>
                                  <span className="text-xs text-ink-400">{g.subtitle}</span>
                                  {onEdit && (
                                    <span className="text-[11px] font-semibold text-brand-600 opacity-0 group-hover/gap:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                                      <IconPencil width={11} height={11} /> แก้ไข
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-ink-400 tabular-nums ml-auto">
                                    {g.filled}/{g.total}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {g.missing.map((m) => (
                                    <span
                                      key={m}
                                      className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 ring-1 ring-rose-200/70"
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ข้อมูลที่ขัดแย้งกัน */}
            {!ai && result.conflicts.length > 0 && (
              <div className="rounded-xl ring-1 ring-amber-200 bg-amber-50/50 p-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <IconX width={15} height={15} className="text-amber-600" />
                  <p className="text-sm font-bold text-ink-900">ข้อมูลที่ขัดแย้งกัน</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 tabular-nums">
                    {result.conflicts.length} รายการ
                  </span>
                </div>
                <ul className="space-y-2">
                  {result.conflicts.map((c) => (
                    <li key={c.key} className="text-sm">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${
                            c.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={c.severity === 'error' ? 'font-semibold text-rose-700' : 'font-semibold text-amber-800'}>
                            {c.title}
                          </p>
                          <p className="text-xs text-ink-500 mt-0.5 break-words">{c.detail}</p>
                          {onEdit && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.refs.map((r, ri) => (
                                <button
                                  key={r.category + r.id + ri}
                                  type="button"
                                  onClick={() => onEdit(r.category, r.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-white hover:bg-brand-50 ring-1 ring-brand-200/70 px-2 py-0.5 rounded-md transition-colors"
                                >
                                  <IconPencil width={10} height={10} /> {r.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Drafted questions */}
            {questions.length > 0 ? (
              <div className="rounded-2xl ring-1 ring-brand-200/70 bg-brand-50/40 p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="text-sm font-bold text-ink-900 inline-flex items-center gap-1.5">
                    <IconClipboard width={16} height={16} className="text-brand-600" /> คำถามสำหรับส่งลูกค้า
                  </p>
                  <button
                    onClick={copyQuestions}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 bg-white ring-1 ring-brand-200/70 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? <IconCheck width={13} height={13} /> : <IconClipboard width={13} height={13} />}
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอกทั้งหมด'}
                  </button>
                </div>
                <ol className="space-y-1.5 text-sm text-ink-700 list-decimal list-inside">
                  {questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            ) : (
              result.totalFields > 0 && result.conflicts.length === 0 && (
                <div className="rounded-2xl ring-1 ring-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-700 inline-flex items-center gap-2">
                  <IconCheckCircle width={18} height={18} /> ข้อมูล VMs และ Service ครบถ้วน พร้อมเริ่มดำเนินการ 🎉
                </div>
              )
            )}

            {aiError && <p className="text-xs text-rose-600">{aiError}</p>}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {result && (
            <button
              onClick={doExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              <IconArrowRight width={15} height={15} className="rotate-90" />
              {exporting ? 'กำลังสร้างไฟล์…' : 'ดาวน์โหลดสรุป (Excel)'}
            </button>
          )}
          {aiEndpointConfigured() && (
            <button
              onClick={runAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 ring-1 ring-brand-200/70 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              <IconLayers width={16} height={16} /> {aiLoading ? 'กำลังวิเคราะห์…' : 'วิเคราะห์ด้วย AI (Claude)'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </Modal>
  )
}
