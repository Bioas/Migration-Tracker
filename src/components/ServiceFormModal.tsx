import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Modal from './Modal'
import { Service, ServiceType } from '../types/project'
import { ServiceInput } from '../store/ProjectStore'
import { IconBalance, IconDatabase, IconBox, IconClipboard, IconBolt, IconCloud } from './Icons'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-xs font-semibold text-ink-600 mb-1'

const TYPES: { type: ServiceType; Icon: typeof IconBalance }[] = [
  { type: 'Load Balancer', Icon: IconBalance },
  { type: 'Database', Icon: IconDatabase },
  { type: 'Object Storage', Icon: IconBox },
]
const algorithms = ['Round Robin', 'Least Connections', 'Source IP']
const protocols = ['HTTP', 'HTTPS', 'TCP', 'UDP']
const availabilityZones = ['NCP-BKK Bangrak', 'NCP-BKK2 Rama 9', 'NCP-NON Nonthaburi']
const topologies = ['Standalone', 'HA']
const engines = ['MySQL', 'PostgreSQL', 'MariaDB', 'Redis', 'MongoDB']
const storageClasses = ['Standard', 'Infrequent Access', 'Archive']
const accesses = ['Private', 'Public']

const empty: ServiceInput = {
  type: 'Load Balancer',
  name: '',
  algorithm: 'Round Robin',
  protocol: 'HTTPS',
  port: '',
  members: '',
  engine: 'MySQL',
  version: '',
  plan: '',
  ha: false,
  bucket: '',
  storageClass: 'Standard',
  access: 'Private',
  capacityGB: 0,
  endpoint: '',
  ipPublic: '',
  ipPrivate: '',
  availabilityZone: 'NCP-BKK Bangrak',
  topology: 'Standalone',
  spec: '',
  storageType: '',
  note: '',
}

const stepFields: Record<ServiceType, (keyof ServiceInput)[][]> = {
  'Load Balancer': [
    ['name', 'availabilityZone', 'topology'],
    ['algorithm', 'protocol', 'port', 'spec', 'members'],
    ['ipPrivate', 'ipPublic', 'endpoint'],
  ],
  Database: [
    ['name', 'availabilityZone', 'engine'],
    ['version', 'plan', 'capacityGB', 'storageType'],
    ['ipPrivate', 'ipPublic'],
  ],
  'Object Storage': [
    ['name', 'bucket'],
    ['storageClass', 'capacityGB', 'access'],
    ['endpoint'],
  ],
}

const steps: { label: string; hint: string; icon: typeof IconClipboard }[] = [
  { label: 'บริการ', hint: 'ประเภทบริการ ชื่อ และตำแหน่งที่ตั้ง', icon: IconClipboard },
  { label: 'สเปก', hint: 'การตั้งค่าและขนาดของบริการ', icon: IconBolt },
  { label: 'เครือข่าย', hint: 'IP, Endpoint และหมายเหตุ', icon: IconCloud },
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

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition-all ${
            value === o
              ? 'bg-navy-700 text-white ring-navy-700 shadow-soft'
              : 'bg-white text-ink-600 ring-ink-200 hover:ring-ink-300 hover:bg-ink-50'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export default function ServiceFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Service | null
  onSubmit: (data: ServiceInput) => void
}) {
  const [form, setForm] = useState<ServiceInput>(empty)
  const [step, setStep] = useState(0)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    if (initial) {
      const { id: _id, ...rest } = initial
      setForm({ ...empty, ...rest })
    } else {
      setForm(empty)
    }
  }, [open, initial])

  const set = <K extends keyof ServiceInput>(k: K, v: ServiceInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const filledCount = (fields: (keyof ServiceInput)[]) =>
    fields.filter((k) => {
      const v = form[k]
      if (typeof v === 'number') return v > 0
      if (typeof v === 'boolean') return v
      return String(v ?? '').trim() !== ''
    }).length

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setStep(0)
      setTimeout(() => nameRef.current?.focus(), 50)
      return
    }
    onSubmit({ ...form, name: form.name.trim(), capacityGB: Number(form.capacityGB) || 0 })
    onClose()
  }

  const fields = stepFields[form.type]
  const isLB = form.type === 'Load Balancer'
  const isDB = form.type === 'Database'
  const isOS = form.type === 'Object Storage'

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={initial ? 'แก้ไข Service' : 'เพิ่ม Service (Add-on)'}
      subtitle={initial ? initial.name : 'บริการเสริมของ NIPA Cloud'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-ink-100">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const done = filledCount(fields[i])
            return (
              <button
                key={s.label}
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
                  {done}/{fields[i].length}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-ink-400 -mt-1 px-1">{steps[step].hint}</p>

        {/* Step 1 — บริการ */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className={labelCls}>ประเภทบริการ</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(({ type, Icon }) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => set('type', type)}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl ring-1 text-xs font-semibold transition-all ${
                      form.type === type
                        ? 'bg-brand-50 ring-brand-300 text-brand-700'
                        : 'bg-white ring-ink-200 text-ink-500 hover:ring-brand-300'
                    }`}
                  >
                    <Icon width={20} height={20} />
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <Field label="ชื่อ Service" required>
              <input ref={nameRef} className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="เช่น lb-web / db-mysql-prod" autoFocus />
            </Field>
            {(isLB || isDB) && (
              <div>
                <label className={labelCls}>Availability Zone</label>
                <ChipGroup options={availabilityZones} value={form.availabilityZone} onChange={(v) => set('availabilityZone', v)} />
              </div>
            )}
            {isLB && (
              <div>
                <label className={labelCls}>Topology</label>
                <ChipGroup options={topologies} value={form.topology} onChange={(v) => set('topology', v)} />
              </div>
            )}
            {isDB && (
              <div>
                <label className={labelCls}>Engine</label>
                <ChipGroup options={engines} value={form.engine} onChange={(v) => set('engine', v)} />
              </div>
            )}
            {isOS && (
              <Field label="Bucket">
                <input className={inputCls} value={form.bucket} onChange={(e) => set('bucket', e.target.value)} placeholder="my-bucket" />
              </Field>
            )}
          </div>
        )}

        {/* Step 2 — สเปก */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {isLB && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Algorithm">
                    <select className={inputCls} value={form.algorithm} onChange={(e) => set('algorithm', e.target.value)}>
                      {algorithms.map((a) => (<option key={a} value={a}>{a}</option>))}
                    </select>
                  </Field>
                  <Field label="Protocol">
                    <select className={inputCls} value={form.protocol} onChange={(e) => set('protocol', e.target.value)}>
                      {protocols.map((a) => (<option key={a} value={a}>{a}</option>))}
                    </select>
                  </Field>
                  <Field label="Port">
                    <input className={inputCls} value={form.port} onChange={(e) => set('port', e.target.value)} placeholder="443" />
                  </Field>
                  <Field label="Spec">
                    <input className={inputCls} value={form.spec} onChange={(e) => set('spec', e.target.value)} placeholder="เช่น 2vCPU/4GB / Small" />
                  </Field>
                </div>
                <Field label="Members (backend)">
                  <input className={inputCls} value={form.members} onChange={(e) => set('members', e.target.value)} placeholder="10.0.0.11, 10.0.0.12" />
                </Field>
              </>
            )}
            {isDB && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Version">
                  <input className={inputCls} value={form.version} onChange={(e) => set('version', e.target.value)} placeholder="8.0" />
                </Field>
                <Field label="Plan">
                  <input className={inputCls} value={form.plan} onChange={(e) => set('plan', e.target.value)} placeholder="4vCPU/16GB" />
                </Field>
                <Field label="Storage">
                  <div className="relative">
                    <input type="number" min={0} className={inputCls + ' pr-12'} value={form.capacityGB} onChange={(e) => set('capacityGB', Number(e.target.value))} />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-400 pointer-events-none">GB</span>
                  </div>
                </Field>
                <Field label="Storage Type">
                  <input className={inputCls} value={form.storageType} onChange={(e) => set('storageType', e.target.value)} placeholder="SSD / NVMe" />
                </Field>
              </div>
            )}
            {isOS && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Storage Class">
                  <select className={inputCls} value={form.storageClass} onChange={(e) => set('storageClass', e.target.value)}>
                    {storageClasses.map((a) => (<option key={a} value={a}>{a}</option>))}
                  </select>
                </Field>
                <Field label="Quota">
                  <div className="relative">
                    <input type="number" min={0} className={inputCls + ' pr-12'} value={form.capacityGB} onChange={(e) => set('capacityGB', Number(e.target.value))} />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-400 pointer-events-none">GB</span>
                  </div>
                </Field>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Access</label>
                  <ChipGroup options={accesses} value={form.access} onChange={(v) => set('access', v)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — เครือข่าย */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            {(isLB || isDB) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="IP Private">
                  <input className={inputCls} value={form.ipPrivate} onChange={(e) => set('ipPrivate', e.target.value)} placeholder="10.0.0.5" />
                </Field>
                <Field label="IP Public">
                  <input className={inputCls} value={form.ipPublic} onChange={(e) => set('ipPublic', e.target.value)} placeholder="203.0.113.x (ถ้ามี)" />
                </Field>
              </div>
            )}
            {!isDB && (
              <Field label="Endpoint">
                <input className={inputCls} value={form.endpoint} onChange={(e) => set('endpoint', e.target.value)} placeholder="host / URL ของบริการ" />
              </Field>
            )}
            <Field label="หมายเหตุ">
              <input className={inputCls} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
            </Field>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-500 hover:bg-ink-100 transition-colors">
            ยกเลิก
          </button>
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
            {initial ? 'บันทึก' : 'เพิ่ม Service'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
