import { Project, Asset, Service, assetPolicies } from '../types/project'

export type CheckCategory = 'VMs' | 'Service'

export interface EntityGap {
  key: string
  id: string
  name: string
  subtitle: string
  category: CheckCategory
  missing: string[]
  filled: number
  total: number
}

export type ConflictSeverity = 'error' | 'warning'

export interface ConflictRef {
  category: CheckCategory
  id: string
  name: string
}

export interface Conflict {
  key: string
  severity: ConflictSeverity
  title: string
  detail: string
  refs: ConflictRef[]
}

export interface CheckResult {
  score: number
  filledFields: number
  totalFields: number
  vmCount: number
  serviceCount: number
  completeVms: number
  completeServices: number
  gaps: EntityGap[]
  conflicts: Conflict[]
  questions: string[]
}

const hasText = (v?: string) => !!(v ?? '').trim()
const hasNum = (v?: number) => Number(v) > 0

/** ฟิลด์ที่จำเป็นต่อการวางแผน migrate ของ VM หนึ่งเครื่อง */
function vmChecks(a: Asset): { label: string; ok: boolean }[] {
  return [
    { label: 'Service', ok: hasText(a.service) },
    { label: 'License', ok: hasText(a.license) },
    { label: 'OS', ok: hasText(a.os) },
    { label: 'vCPU', ok: hasNum(a.vcpu) },
    { label: 'RAM', ok: hasNum(a.ramGB) },
    { label: 'Storage Type', ok: hasText(a.storageType) },
    { label: 'OS Disk', ok: hasNum(a.osDiskGB) },
    { label: 'IP Private', ok: hasText(a.ipAddress) },
    { label: 'Subnet mask', ok: hasText(a.subnetMask) },
    {
      label: 'Network Policy (Port / Source / Destination)',
      ok: assetPolicies(a).some((r) => hasText(r.port) && hasText(r.source) && hasText(r.destination)),
    },
  ]
}

/** ฟิลด์ที่จำเป็นของ Service — ต่างกันตามประเภท */
function serviceChecks(s: Service): { label: string; ok: boolean }[] {
  if (s.type === 'Database') {
    return [
      { label: 'Availability Zone', ok: hasText(s.availabilityZone) },
      { label: 'Engine', ok: hasText(s.engine) },
      { label: 'Version', ok: hasText(s.version) },
      { label: 'Plan', ok: hasText(s.plan) },
      { label: 'Storage (GB)', ok: hasNum(s.capacityGB) },
      { label: 'Storage Type', ok: hasText(s.storageType) },
      { label: 'IP Private', ok: hasText(s.ipPrivate) },
    ]
  }
  if (s.type === 'Object Storage') {
    return [
      { label: 'Bucket', ok: hasText(s.bucket) },
      { label: 'Storage Class', ok: hasText(s.storageClass) },
      { label: 'Quota (GB)', ok: hasNum(s.capacityGB) },
      { label: 'Access', ok: hasText(s.access) },
    ]
  }
  // Load Balancer
  return [
    { label: 'Availability Zone', ok: hasText(s.availabilityZone) },
    { label: 'Topology', ok: hasText(s.topology) },
    { label: 'Algorithm', ok: hasText(s.algorithm) },
    { label: 'Protocol', ok: hasText(s.protocol) },
    { label: 'Port', ok: hasText(s.port) },
    { label: 'Spec', ok: hasText(s.spec) },
    { label: 'IP Private', ok: hasText(s.ipPrivate) },
    { label: 'Members (backend)', ok: hasText(s.members) },
  ]
}

const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g

/** ดึงเฉพาะ IPv4 ออกจากข้อความ (รองรับค่าที่มีหมายเหตุ เช่น "10.0.0.5 (VIP)") */
function extractIps(v?: string): string[] {
  return String(v ?? '').match(IPV4) ?? []
}

/** จับ IP เดี่ยวจากค่า network policy — CIDR ที่ไม่ใช่ /32 ถือว่าเป็นช่วง ไม่ตรวจ */
function singleIp(v: string): string | null {
  const t = v.trim()
  const m = t.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/32)?$/)
  return m ? m[1] : null
}

/** ตรวจข้อมูลที่ขัดแย้ง/ไม่สอดคล้องกันระหว่าง VMs และ Service */
function findConflicts(assets: Asset[], services: Service[]): Conflict[] {
  const conflicts: Conflict[] = []
  const vmRef = (a: Asset): ConflictRef => ({ category: 'VMs', id: a.id, name: a.name || '(ไม่มีชื่อ)' })
  const svRef = (s: Service): ConflictRef => ({ category: 'Service', id: s.id, name: s.name || '(ไม่มีชื่อ)' })

  // 1) IP ซ้ำ (private = ผิดแน่นอน, public = ควรตรวจสอบ)
  const collect = (field: 'private' | 'public') => {
    const map = new Map<string, ConflictRef[]>()
    for (const a of assets) {
      const v = field === 'private' ? a.ipAddress : a.ipPublic
      for (const ip of extractIps(v)) map.set(ip, [...(map.get(ip) ?? []), vmRef(a)])
    }
    for (const sv of services) {
      const v = field === 'private' ? sv.ipPrivate : sv.ipPublic
      for (const ip of extractIps(v)) map.set(ip, [...(map.get(ip) ?? []), svRef(sv)])
    }
    return map
  }
  for (const [field, severity, label] of [
    ['private', 'error', 'IP Private'],
    ['public', 'warning', 'IP Public'],
  ] as const) {
    for (const [ip, refs] of collect(field)) {
      if (refs.length > 1)
        conflicts.push({
          key: 'dup-' + field + '-' + ip,
          severity,
          title: label + ' ' + ip + ' ซ้ำกัน ' + refs.length + ' รายการ',
          detail: refs.map((r) => r.name).join(' · '),
          refs,
        })
    }
  }

  // 2) ชื่อซ้ำ
  const dupName = (list: { name: string; ref: ConflictRef }[], what: string) => {
    const map = new Map<string, ConflictRef[]>()
    for (const x of list) {
      const k = x.name.trim().toLowerCase()
      if (!k) continue
      map.set(k, [...(map.get(k) ?? []), x.ref])
    }
    for (const [, refs] of map)
      if (refs.length > 1)
        conflicts.push({
          key: 'dupname-' + what + '-' + refs[0].name,
          severity: 'error',
          title: 'ชื่อ ' + what + ' "' + refs[0].name + '" ซ้ำกัน ' + refs.length + ' รายการ',
          detail: 'ชื่อควรไม่ซ้ำเพื่อไม่ให้สับสนตอน migrate',
          refs,
        })
  }
  dupName(assets.map((a) => ({ name: a.name, ref: vmRef(a) })), 'VM')
  dupName(services.map((sv) => ({ name: sv.name, ref: svRef(sv) })), 'Service')

  // 3) Domain ซ้ำ
  const domainMap = new Map<string, ConflictRef[]>()
  for (const a of assets) {
    const d = (a.domain ?? '').trim().toLowerCase()
    if (d) domainMap.set(d, [...(domainMap.get(d) ?? []), vmRef(a)])
  }
  for (const [d, refs] of domainMap)
    if (refs.length > 1)
      conflicts.push({
        key: 'dupdomain-' + d,
        severity: 'warning',
        title: 'Domain "' + d + '" ใช้ซ้ำ ' + refs.length + ' เครื่อง',
        detail: refs.map((r) => r.name).join(' · '),
        refs,
      })

  // 4) Members ของ Load Balancer ที่ไม่ตรงกับ IP ของ VM ที่มีอยู่
  const vmIps = new Set<string>()
  for (const a of assets) {
    for (const ip of extractIps(a.ipAddress)) vmIps.add(ip)
    for (const ip of extractIps(a.ipPublic)) vmIps.add(ip)
  }
  for (const sv of services) {
    if (sv.type !== 'Load Balancer') continue
    const members = extractIps(sv.members)
    if (!members.length) continue
    const unknown = members.filter((ip) => !vmIps.has(ip))
    if (unknown.length)
      conflicts.push({
        key: 'lb-members-' + sv.id,
        severity: 'warning',
        title: 'Members ของ "' + (sv.name || 'LB') + '" อ้าง IP ที่ไม่มีใน VMs',
        detail: unknown.join(', ') + ' — ยังไม่มีเครื่องไหนใช้ IP นี้ (อาจยังไม่ได้เพิ่ม VM หรือกรอกผิด)',
        refs: [svRef(sv)],
      })
  }

  // 5) Network Policy อ้าง IP เดี่ยวที่ไม่มีใน VMs
  for (const a of assets) {
    const unknown = new Set<string>()
    for (const rule of assetPolicies(a)) {
      for (const v of [rule.source, rule.destination]) {
        const ip = singleIp(v)
        if (ip && !vmIps.has(ip)) unknown.add(ip)
      }
    }
    if (unknown.size)
      conflicts.push({
        key: 'policy-ip-' + a.id,
        severity: 'warning',
        title: 'Network Policy ของ "' + (a.name || 'VM') + '" อ้าง IP ที่ไม่มีใน VMs',
        detail: [...unknown].join(', ') + ' — ตรวจว่าเป็นเครื่องนอกขอบเขต migration หรือกรอกผิด',
        refs: [vmRef(a)],
      })
  }

  const order = { error: 0, warning: 1 }
  return conflicts.sort((x, y) => order[x.severity] - order[y.severity])
}

/** ตรวจความครบถ้วนจากข้อมูล VMs และ Service ในระบบเท่านั้น */
export function analyzeProject(project: Project): CheckResult {
  const assets = project.assets ?? []
  const services = project.services ?? []

  let filledFields = 0
  let totalFields = 0
  let completeVms = 0
  let completeServices = 0
  const gaps: EntityGap[] = []

  for (const a of assets) {
    const checks = vmChecks(a)
    const missing = checks.filter((c) => !c.ok).map((c) => c.label)
    filledFields += checks.length - missing.length
    totalFields += checks.length
    if (missing.length === 0) completeVms++
    else
      gaps.push({
        key: 'vm-' + a.id,
        id: a.id,
        name: a.name || '(ไม่มีชื่อเครื่อง)',
        subtitle: [a.role, a.source].filter(Boolean).join(' · '),
        category: 'VMs',
        missing,
        filled: checks.length - missing.length,
        total: checks.length,
      })
  }

  for (const s of services) {
    const checks = serviceChecks(s)
    const missing = checks.filter((c) => !c.ok).map((c) => c.label)
    filledFields += checks.length - missing.length
    totalFields += checks.length
    if (missing.length === 0) completeServices++
    else
      gaps.push({
        key: 'sv-' + s.id,
        id: s.id,
        name: s.name || '(ไม่มีชื่อ Service)',
        subtitle: s.type,
        category: 'Service',
        missing,
        filled: checks.length - missing.length,
        total: checks.length,
      })
  }

  const conflicts = findConflicts(assets, services)

  const score = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0

  const questions: string[] = []
  if (assets.length === 0) {
    questions.push('ขอรายการเครื่อง/VM ที่ต้องย้ายทั้งหมด พร้อม spec (OS, vCPU, RAM, Disk, IP) และ Network Policy')
  }
  for (const g of gaps) {
    questions.push(
      g.category === 'VMs'
        ? `เครื่อง "${g.name}" ขอข้อมูลเพิ่ม: ${g.missing.join(', ')}`
        : `Service "${g.name}" (${g.subtitle}) ขอข้อมูลเพิ่ม: ${g.missing.join(', ')}`
    )
  }

  for (const c of conflicts) questions.push('ขอยืนยันข้อมูล: ' + c.title + ' (' + c.detail + ')')

  return {
    score,
    filledFields,
    totalFields,
    vmCount: assets.length,
    serviceCount: services.length,
    completeVms,
    completeServices,
    gaps,
    conflicts,
    questions,
  }
}
