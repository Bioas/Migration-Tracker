import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Modal from './Modal'
import {
  Asset,
  AssetRole,
  AssetSource,
  AssetStatus,
  NetworkPolicyRule,
  assetPolicies,
} from '../types/project'
import { AssetInput } from '../store/ProjectStore'
import { IconClipboard, IconBolt, IconCloud, IconCheck, IconPlus, IconTrash } from './Icons'
import Select from './Select'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-xs font-semibold text-ink-600 mb-1'

const roles: AssetRole[] = ['Web', 'App', 'Database', 'Firewall', 'Load Balancer', 'Other']
const sources: AssetSource[] = ['VMware', 'Hyper-V', 'AWS', 'Azure', 'GCP', 'Bare Metal', 'Other']

export const assetStatusLabels: Record<AssetStatus, string> = {
  Pending: 'รอเริ่ม',
  Replicating: 'กำลัง Replicate',
  Testing: 'กำลังทดสอบ',
  Migrated: 'ย้ายแล้ว',
  Failed: 'ล้มเหลว',
}

const empty: AssetInput = {
  name: '',
  role: 'Web',
  service: '',
  license: '',
  source: 'VMware',
  os: '',
  machineType: '',
  vcpu: 2,
  ramGB: 4,
  storageType: 'SSD',
  osDiskGB: 50,
  dataDiskGB: 0,
  ipAddress: '',
  subnetMask: '',
  ipPublic: '',
  domain: '',
  ports: '',
  allowedSource: '',
  policies: [],
  method: 'Hystax',
  status: 'Pending',
  destination: '',
  note: '',
}

type StepKey = 'machine' | 'spec' | 'network'

const steps: {
  key: StepKey
  label: string
  hint: string
  icon: typeof IconClipboard
  fields: (keyof AssetInput)[]
}[] = [
  {
    key: 'machine',
    label: 'ข้อมูลเครื่อง',
    hint: 'ชื่อเครื่อง บทบาท และระบบปฏิบัติการ',
    icon: IconClipboard,
    fields: ['name', 'service', 'license', 'os'],
  },
  {
    key: 'spec',
    label: 'สเปก',
    hint: 'Compute & Storage ของเครื่อง',
    icon: IconBolt,
    fields: ['machineType', 'vcpu', 'ramGB', 'storageType', 'osDiskGB', 'dataDiskGB'],
  },
  {
    key: 'network',
    label: 'เครือข่าย',
    hint: 'IP, Domain และ Network Policy',
    icon: IconCloud,
    fields: ['ipAddress', 'subnetMask', 'ipPublic', 'domain', 'policies'],
  },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function UnitInput({
  value,
  onChange,
  unit,
}: {
  value: number
  onChange: (v: number) => void
  unit: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        className={inputCls + ' pr-12'}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-400 pointer-events-none">
        {unit}
      </span>
    </div>
  )
}

export default function AssetFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Asset | null
  onSubmit: (data: AssetInput) => void
}) {
  const [form, setForm] = useState<AssetInput>(empty)
  const [step, setStep] = useState(0)
  const [continuous, setContinuous] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [justSaved, setJustSaved] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const flashTimer = useRef<number>()

  useEffect(() => {
    if (!open) return
    setStep(0)
    setAddedCount(0)
    setJustSaved(null)
    if (initial) {
      const { id: _id, ...rest } = initial
      setForm({ ...empty, ...rest, policies: assetPolicies(initial) })
    } else {
      setForm(empty)
    }
  }, [open, initial])

  const set = <K extends keyof AssetInput>(k: K, v: AssetInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const addRule = () =>
    setForm((f) => ({ ...f, policies: [...(f.policies ?? []), { port: '', source: '', destination: '' }] }))
  const removeRule = (i: number) =>
    setForm((f) => ({ ...f, policies: (f.policies ?? []).filter((_, idx) => idx !== i) }))
  const setRule = (i: number, k: keyof NetworkPolicyRule, v: string) =>
    setForm((f) => ({
      ...f,
      policies: (f.policies ?? []).map((r, idx) => (idx === i ? { ...r, [k]: v } : r)),
    }))

  const filledCount = (fields: (keyof AssetInput)[]) =>
    fields.filter((k) => {
      const v = form[k]
      if (Array.isArray(v)) return v.some((r) => r.port || r.source || r.destination)
      if (typeof v === 'number') return v > 0
      return String(v ?? '').trim() !== ''
    }).length

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setStep(0)
      setTimeout(() => nameRef.current?.focus(), 50)
      return
    }
    const savedName = form.name.trim()
    const policies = (form.policies ?? []).filter((r) => r.port.trim() || r.source.trim() || r.destination.trim())
    const joined = (pick: (r: NetworkPolicyRule) => string) =>
      [...new Set(policies.map(pick).map((s) => s.trim()).filter(Boolean))].join(', ')
    onSubmit({
      ...form,
      name: savedName,
      vcpu: Number(form.vcpu) || 0,
      ramGB: Number(form.ramGB) || 0,
      osDiskGB: Number(form.osDiskGB) || 0,
      dataDiskGB: Number(form.dataDiskGB) || 0,
      policies,
      // legacy summary fields — keep import/older views working
      ports: joined((r) => r.port),
      allowedSource: joined((r) => r.source),
      destination: joined((r) => r.destination),
    })
    if (continuous && !initial) {
      // คงค่าที่มักซ้ำกัน (Source, OS, สเปก, network policy) — เคลียร์เฉพาะค่าเฉพาะเครื่อง
      setForm((f) => ({
        ...f,
        name: '',
        service: '',
        ipAddress: '',
        ipPublic: '',
        domain: '',
        note: '',
      }))
      setStep(0)
      setAddedCount((n) => n + 1)
      setJustSaved(savedName)
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setJustSaved(null), 3000)
      setTimeout(() => nameRef.current?.focus(), 50)
      return
    }
    onClose()
  }

  const active = steps[step]

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={initial ? 'แก้ไข VM / Asset' : 'เพิ่ม VM / Asset'}
      subtitle={initial ? initial.name : 'ข้อมูลเครื่องตามแบบฟอร์ม intake'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-ink-100">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const done = filledCount(s.fields)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-navy-700 shadow-soft'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <Icon width={16} height={16} />
                <span>{s.label}</span>
                <span
                  className={`hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-brand-50 text-brand-600' : 'bg-ink-200/70 text-ink-500'
                  }`}
                >
                  {done}/{s.fields.length}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-ink-400 -mt-1 px-1">{active.hint}</p>

        {/* Step 1 — ข้อมูลเครื่อง */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="VMName / Hostname" required>
              <input
                ref={nameRef}
                className={inputCls}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="web-prod-01"
                autoFocus
              />
            </Field>
            <div>
              <label className={labelCls}>Type (บทบาทของเครื่อง)</label>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('role', r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition-all ${
                      form.role === r
                        ? 'bg-navy-700 text-white ring-navy-700 shadow-soft'
                        : 'bg-white text-ink-600 ring-ink-200 hover:ring-ink-300 hover:bg-ink-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="ต้นทาง (Source)">
                <Select
                  ariaLabel="ต้นทาง (Source)"
                  value={form.source ?? ''}
                  onChange={(v) => set('source', v as AssetSource)}
                  options={sources.map((s) => ({ value: s, label: s }))}
                />
              </Field>
              <Field label="OS">
                <input className={inputCls} value={form.os} onChange={(e) => set('os', e.target.value)} placeholder="Ubuntu 22.04 / Windows Server 2019" />
              </Field>
              <Field label="Service">
                <input className={inputCls} value={form.service} onChange={(e) => set('service', e.target.value)} placeholder="เช่น Web Portal (IIS)" />
              </Field>
              <Field label="License">
                <input className={inputCls} value={form.license} onChange={(e) => set('license', e.target.value)} placeholder="เช่น Windows Server (BYOL)" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 2 — สเปก */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="Machine Type / Flavor">
              <input className={inputCls} value={form.machineType} onChange={(e) => set('machineType', e.target.value)} placeholder="เช่น 4vCPU/16GB" />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="vCPU">
                <UnitInput value={form.vcpu} onChange={(v) => set('vcpu', v)} unit="core" />
              </Field>
              <Field label="RAM">
                <UnitInput value={form.ramGB} onChange={(v) => set('ramGB', v)} unit="GB" />
              </Field>
              <Field label="Storage Type">
                <input className={inputCls} value={form.storageType} onChange={(e) => set('storageType', e.target.value)} placeholder="SSD" />
              </Field>
              <Field label="OS Disk">
                <UnitInput value={form.osDiskGB} onChange={(v) => set('osDiskGB', v)} unit="GB" />
              </Field>
              <Field label="Data Disk">
                <UnitInput value={form.dataDiskGB} onChange={(v) => set('dataDiskGB', v)} unit="GB" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 3 — เครือข่าย */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="IP Private">
                <input className={inputCls} value={form.ipAddress} onChange={(e) => set('ipAddress', e.target.value)} placeholder="10.0.0.10" />
              </Field>
              <Field label="Subnet mask">
                <input className={inputCls} value={form.subnetMask} onChange={(e) => set('subnetMask', e.target.value)} placeholder="255.255.255.0" />
              </Field>
              <Field label="IP Public">
                <input className={inputCls} value={form.ipPublic} onChange={(e) => set('ipPublic', e.target.value)} placeholder="203.0.113.10 (ถ้ามี)" />
              </Field>
              <Field label="Domain name">
                <input className={inputCls} value={form.domain} onChange={(e) => set('domain', e.target.value)} placeholder="app.example.com" />
              </Field>
            </div>
            <div className="rounded-xl ring-1 ring-ink-200 bg-ink-50/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Network Policy</p>
                {(form.policies?.length ?? 0) > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-navy-100 text-navy-700 tabular-nums">
                    {form.policies!.length} rule{form.policies!.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {(form.policies?.length ?? 0) > 0 && (
                <div className="hidden sm:grid grid-cols-[1fr_1.4fr_1.4fr_28px] gap-2 px-0.5">
                  <span className={labelCls + ' mb-0'}>Port</span>
                  <span className={labelCls + ' mb-0'}>Source</span>
                  <span className={labelCls + ' mb-0'}>Destination</span>
                  <span />
                </div>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin p-1 -m-1">
                {(form.policies ?? []).map((rule, i) => (
                  <div
                    key={i}
                    className="grid gap-2 items-center grid-cols-[76px_minmax(0,1fr)_28px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_28px] rounded-xl ring-1 ring-ink-200/80 bg-white/70 p-2 sm:p-0 sm:ring-0 sm:bg-transparent sm:rounded-none"
                  >
                    <input
                      className={inputCls + ' !py-2 min-w-0'}
                      value={rule.port}
                      onChange={(e) => setRule(i, 'port', e.target.value)}
                      placeholder="443"
                    />
                    <input
                      className={inputCls + ' !py-2 min-w-0'}
                      value={rule.source}
                      onChange={(e) => setRule(i, 'source', e.target.value)}
                      placeholder="0.0.0.0/0"
                    />
                    <div className="col-span-3 sm:col-span-1 order-4 sm:order-none flex items-center gap-1.5 min-w-0">
                      <span className="sm:hidden text-ink-400 text-xs shrink-0">→</span>
                      <input
                        className={inputCls + ' !py-2 flex-1 min-w-0'}
                        value={rule.destination}
                        onChange={(e) => setRule(i, 'destination', e.target.value)}
                        placeholder="10.0.0.0/24"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRule(i)}
                      title="ลบ rule นี้"
                      className="order-3 sm:order-none w-7 h-7 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                    >
                      <IconTrash width={15} height={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRule}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 px-2 py-1.5 rounded-lg hover:bg-navy-50 transition-colors"
              >
                <IconPlus width={14} height={14} /> เพิ่ม rule
              </button>
            </div>
            <Field label="หมายเหตุ">
              <input className={inputCls} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="dependency / รายละเอียดเพิ่มเติม" />
            </Field>
          </div>
        )}

        {/* Saved flash (continuous mode) */}
        {justSaved && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 text-sm text-emerald-700 animate-fade-in">
            <IconCheck width={16} height={16} />
            <span>
              บันทึก <span className="font-semibold">{justSaved}</span> แล้ว — กรอกเครื่องถัดไปได้เลย
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-500 hover:bg-ink-100 transition-colors">
            {addedCount > 0 ? 'เสร็จสิ้น' : 'ยกเลิก'}
          </button>
          {!initial && (
            <button
              type="button"
              onClick={() => setContinuous((c) => !c)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ring-1 transition-all ${
                continuous
                  ? 'bg-brand-50 text-brand-700 ring-brand-300'
                  : 'text-ink-500 ring-ink-200 hover:bg-ink-50'
              }`}
            >
              <span
                className={`relative inline-block w-8 h-[18px] rounded-full transition-colors ${
                  continuous ? 'bg-brand-500' : 'bg-ink-300'
                }`}
              >
                <span
                  className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow-soft transition-all ${
                    continuous ? 'left-[16px]' : 'left-[2px]'
                  }`}
                />
              </span>
              เพิ่มต่อเนื่อง
              {addedCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  +{addedCount}
                </span>
              )}
            </button>
          )}
          <div className="flex-1" />
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50 transition-colors"
            >
              ย้อนกลับ
            </button>
          )}
          {step < steps.length - 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-navy-700 ring-1 ring-navy-200 bg-navy-50 hover:bg-navy-100 transition-colors"
            >
              ถัดไป
            </button>
          )}
          <button type="submit" className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors">
            {initial ? 'บันทึก' : continuous ? 'บันทึกและเพิ่มต่อ' : 'เพิ่ม VM'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
