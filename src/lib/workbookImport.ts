import type * as XLSXT from 'xlsx'
import { ServiceInput } from '../store/ProjectStore'
import { ServiceType } from '../types/project'
import { parseMatrix, type ParseResult, type ParsedRow } from './assetImport'

// ---------- Service sheet parsing ----------

const DEFAULT_SERVICE: ServiceInput = {
  type: 'Load Balancer', name: '', algorithm: '', protocol: '', port: '', members: '',
  engine: '', version: '', plan: '', ha: false, bucket: '', storageClass: '', access: '',
  capacityGB: 0, endpoint: '', ipPublic: '', ipPrivate: '', availabilityZone: '',
  topology: '', spec: '', storageType: '', note: '',
}

type SField = keyof ServiceInput

// Priority order — specific headers matched before generic ones
const SERVICE_ALIASES: [SField, string[]][] = [
  ['availabilityZone', ['availability zone', 'az']],
  ['storageClass', ['storage class']],
  ['storageType', ['storage type', 'disk type']],
  ['capacityGB', ['storage (gb)', 'quota', 'capacity', 'size (gb)']],
  ['ipPrivate', ['ip private', 'private ip']],
  ['ipPublic', ['ip public', 'public ip']],
  ['type', ['service type', 'type', 'ประเภท']],
  ['name', ['service name', 'ชื่อบริการ', 'ชื่อ service', 'name', 'ชื่อ']],
  ['topology', ['topology']],
  ['algorithm', ['algorithm', 'algo']],
  ['protocol', ['protocol']],
  ['port', ['port']],
  ['spec', ['spec', 'flavor']],
  ['members', ['member', 'backend']],
  ['engine', ['engine']],
  ['version', ['version', 'เวอร์ชัน']],
  ['plan', ['plan']],
  ['bucket', ['bucket']],
  ['access', ['access']],
  ['endpoint', ['endpoint', 'url']],
  ['note', ['note', 'remark', 'หมายเหตุ']],
]

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

function matchServiceField(header: string): SField | null {
  const h = norm(header)
  if (!h) return null
  for (const [field, aliases] of SERVICE_ALIASES) {
    if (aliases.some((a) => h.includes(a))) return field
  }
  return null
}

function toServiceType(raw: string): ServiceType | null {
  const v = raw.toLowerCase().trim()
  if (!v) return null
  if (/load ?balanc|(^|\W)lb($|\W)/.test(v)) return 'Load Balancer'
  if (/database|(^|\W)db($|\W)|mysql|postgres|mariadb|redis|mongo/.test(v)) return 'Database'
  if (/object|bucket|s3|storage/.test(v)) return 'Object Storage'
  return null
}

export interface ParsedServiceRow {
  index: number
  service: ServiceInput
  errors: string[]
  warnings: string[]
}

export interface ServiceParseResult {
  rows: ParsedServiceRow[]
  mappedFields: SField[]
  headerFound: boolean
}

export function parseServiceMatrix(matrix: unknown[][], sheetHint: ServiceType | null = null): ServiceParseResult {
  let headerRowIndex = -1
  let best = 0
  const scan = Math.min(matrix.length, 15)
  for (let i = 0; i < scan; i++) {
    const matched = new Set<SField>()
    for (const cell of matrix[i] ?? []) {
      const f = matchServiceField(String(cell ?? ''))
      if (f) matched.add(f)
    }
    if (matched.size > best) {
      best = matched.size
      headerRowIndex = i
    }
  }
  if (headerRowIndex < 0 || best < 2) return { rows: [], mappedFields: [], headerFound: false }

  const cols: Partial<Record<SField, number>> = {}
  ;(matrix[headerRowIndex] ?? []).forEach((cell, idx) => {
    const f = matchServiceField(String(cell ?? ''))
    if (f && cols[f] === undefined) cols[f] = idx
  })

  const get = (row: unknown[], f: SField) =>
    cols[f] !== undefined ? String(row[cols[f]!] ?? '').trim() : ''

  const rows: ParsedServiceRow[] = []
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const row = matrix[i] ?? []
    if (row.every((c) => String(c ?? '').trim() === '')) continue
    const errors: string[] = []
    const warnings: string[] = []
    const name = get(row, 'name')
    if (!name) errors.push('ไม่มีชื่อ Service')

    // ระบุประเภท: จากคอลัมน์ type → จากข้อมูลในแถว → จากชื่อ sheet
    let type = toServiceType(get(row, 'type'))
    if (!type) {
      if (get(row, 'engine')) type = 'Database'
      else if (get(row, 'bucket')) type = 'Object Storage'
      else if (get(row, 'algorithm') || get(row, 'members')) type = 'Load Balancer'
    }
    if (!type) type = sheetHint
    if (!type) {
      type = 'Load Balancer'
      warnings.push('ระบุประเภทบริการไม่ได้ ใช้ค่า "Load Balancer"')
    }

    const capRaw = get(row, 'capacityGB')
    const cap = Number(String(capRaw).replace(/[, ]+/g, ''))
    if (capRaw && Number.isNaN(cap)) warnings.push(`Storage "${capRaw}" ไม่ใช่ตัวเลข`)

    const service: ServiceInput = {
      ...DEFAULT_SERVICE,
      type,
      name,
      availabilityZone: get(row, 'availabilityZone'),
      topology: get(row, 'topology'),
      algorithm: get(row, 'algorithm'),
      protocol: get(row, 'protocol'),
      port: get(row, 'port'),
      spec: get(row, 'spec'),
      members: get(row, 'members'),
      engine: get(row, 'engine'),
      version: get(row, 'version'),
      plan: get(row, 'plan'),
      storageType: get(row, 'storageType'),
      capacityGB: Number.isNaN(cap) ? 0 : cap,
      bucket: get(row, 'bucket'),
      storageClass: get(row, 'storageClass'),
      access: get(row, 'access'),
      endpoint: get(row, 'endpoint'),
      ipPrivate: get(row, 'ipPrivate'),
      ipPublic: get(row, 'ipPublic'),
      note: get(row, 'note'),
    }
    rows.push({ index: rows.length + 1, service, errors, warnings })
  }

  return { rows, mappedFields: Object.keys(cols) as SField[], headerFound: true }
}

// ---------- Workbook classification ----------

export type SheetKind = 'vm' | 'service' | 'skipped'

export interface SheetResult {
  name: string
  kind: SheetKind
  reason: string
  vm?: ParseResult
  service?: ServiceParseResult
  matrix?: unknown[][]
}

export interface WorkbookResult {
  sheets: SheetResult[]
}

const VM_STRONG: string[] = ['vcpu', 'ramGB', 'osDiskGB', 'dataDiskGB', 'machineType', 'subnetMask', 'allowedSource']
const SVC_STRONG: string[] = ['engine', 'bucket', 'storageClass', 'availabilityZone', 'topology', 'algorithm', 'members', 'plan', 'endpoint']

const VM_SHEET_HINT = /vm|server|inventory|host|machine|เครื่อง/i
const SVC_SHEET_HINT = /service|lb|balanc|database|db|storage|s3|บริการ/i
const SKIP_SHEET_HINT = /diagram|drawing|plan|action|timeline|schedule|contact|cover|summary|สรุป|แผน/i

function sheetHintType(name: string): ServiceType | null {
  const v = name.toLowerCase()
  if (/lb|balanc/.test(v)) return 'Load Balancer'
  if (/database|db/.test(v)) return 'Database'
  if (/storage|s3/.test(v)) return 'Object Storage'
  return null
}

export function classifySheet(name: string, matrix: unknown[][]): SheetResult {
  const vm = parseMatrix(matrix)
  const service = parseServiceMatrix(matrix, sheetHintType(name))

  const vmValid = vm.headerFound && vm.rows.some((r) => r.errors.length === 0)
  const svcValid = service.headerFound && service.rows.some((r) => r.errors.length === 0)

  let vmScore = vmValid ? vm.mappedFields.length + vm.mappedFields.filter((f) => (VM_STRONG as string[]).includes(f)).length * 2 : 0
  let svcScore = svcValid ? service.mappedFields.length + service.mappedFields.filter((f) => (SVC_STRONG as string[]).includes(f)).length * 2 : 0
  if (VM_SHEET_HINT.test(name) && !SVC_SHEET_HINT.test(name)) vmScore += 4
  if (SVC_SHEET_HINT.test(name) && !VM_SHEET_HINT.test(name)) svcScore += 4
  const skipHinted = SKIP_SHEET_HINT.test(name)
  const threshold = skipHinted ? 9 : 5

  if (vmScore >= threshold && vmScore >= svcScore) {
    return { name, kind: 'vm', reason: `พบตาราง VM (${vm.rows.length} แถว)`, vm, matrix }
  }
  if (svcScore >= threshold && svcScore > vmScore) {
    return { name, kind: 'service', reason: `พบตาราง Service (${service.rows.length} แถว)`, service, matrix }
  }
  return {
    name,
    kind: 'skipped',
    matrix,
    reason: skipHinted ? 'ข้าม — ไม่ใช่ข้อมูล VM/Service (เช่น diagram / action plan)' : 'ข้าม — ไม่พบหัวตาราง VM หรือ Service ที่รู้จัก',
  }
}

// ---------- AI-assisted mapping ----------
// รับผล map จาก AI แล้วเขียนหัวตารางใหม่เป็นชื่อมาตรฐานที่ parser เดิมรู้จัก 100%
// จากนั้น parse ซ้ำด้วยกลไกเดียวกับการจำแนกอัตโนมัติ

const VM_CANON: Record<string, string> = {
  name: 'vmname', role: 'type', service: 'service', license: 'license', machineType: 'machine type',
  vcpu: 'vcpu', ramGB: 'ram', storageType: 'storage type', osDiskGB: 'os disk', dataDiskGB: 'data disk',
  os: 'operating system', subnetMask: 'subnet', ipPublic: 'ip public', domain: 'domain', ports: 'port',
  allowedSource: 'allowed source', ipAddress: 'ip private', destination: 'destination', method: 'method', status: 'status',
}
const SVC_CANON: Record<string, string> = {
  name: 'service name', type: 'service type', availabilityZone: 'availability zone', topology: 'topology',
  algorithm: 'algorithm', protocol: 'protocol', port: 'port', spec: 'spec', members: 'member',
  engine: 'engine', version: 'version', plan: 'plan', storageType: 'storage type', capacityGB: 'storage (gb)',
  bucket: 'bucket', storageClass: 'storage class', access: 'access', endpoint: 'endpoint',
  ipPrivate: 'ip private', ipPublic: 'ip public', note: 'note',
}

export interface AiMapping {
  kind: 'vm' | 'service' | 'none'
  headerRowIndex: number
  serviceTypeDefault: string
  columns: { index: number; field: string }[]
  note: string
}

export function applyAiMapping(name: string, matrix: unknown[][], ai: AiMapping): SheetResult {
  const aiNote = (ai.note || '').trim()
  if (ai.kind === 'none' || ai.columns.length === 0) {
    return { name, kind: 'skipped', matrix, reason: 'AI ยืนยัน: ' + (aiNote || 'ไม่ใช่ข้อมูล VM/Service') }
  }
  const canon = ai.kind === 'vm' ? VM_CANON : SVC_CANON
  const hdr = Math.max(0, Math.min(Math.floor(ai.headerRowIndex) || 0, matrix.length - 1))
  const width = matrix.reduce((w, r) => Math.max(w, Array.isArray(r) ? r.length : 0), 0)
  const headerRow: string[] = new Array(width).fill('')
  for (const c of ai.columns) {
    if (canon[c.field] && Number.isInteger(c.index) && c.index >= 0 && c.index < width) headerRow[c.index] = canon[c.field]
  }
  const m2 = matrix.map((r, i) => (i < hdr ? [] : i === hdr ? headerRow : r))

  if (ai.kind === 'vm') {
    const vm = parseMatrix(m2)
    if (vm.headerFound && vm.rows.length > 0) {
      return { name, kind: 'vm', matrix, vm, reason: 'AI จำแนก: ' + (aiNote || 'ตาราง VM') }
    }
    return { name, kind: 'skipped', matrix, reason: 'AI map คอลัมน์แล้ว แต่ไม่พบแถวข้อมูลที่นำเข้าได้' }
  }

  const hint =
    (['Load Balancer', 'Database', 'Object Storage'] as ServiceType[]).find((t) => t === ai.serviceTypeDefault) ??
    sheetHintType(name)
  const service = parseServiceMatrix(m2, hint)
  if (service.headerFound && service.rows.length > 0) {
    return { name, kind: 'service', matrix, service, reason: 'AI จำแนก: ' + (aiNote || 'ตาราง Service') }
  }
  return { name, kind: 'skipped', matrix, reason: 'AI map คอลัมน์แล้ว แต่ไม่พบแถวข้อมูลที่นำเข้าได้' }
}

export async function parseWorkbookFile(file: File): Promise<WorkbookResult> {
  const XLSX = await import('xlsx')
  const isCsv = /\.csv$/i.test(file.name)
  let wb: XLSXT.WorkBook
  if (isCsv) {
    const text = await file.text()
    wb = XLSX.read(text, { type: 'string' })
  } else {
    const buf = await file.arrayBuffer()
    wb = XLSX.read(buf, { type: 'array' })
  }
  const sheets: SheetResult[] = wb.SheetNames.map((sheetName) => {
    const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false }) as unknown[][]
    const displayName = isCsv ? file.name.replace(/\.csv$/i, '') : sheetName
    return classifySheet(displayName, matrix)
  })
  return { sheets }
}

export type { ParsedRow }

// ---------- Template ----------

const VM_TEMPLATE = [
  ['VMName', 'Type', 'Service', 'License', 'Source', 'OS', 'Machine Type', 'vCPU', 'RAM (GB)', 'Storage Type', 'OS Disk (GB)', 'Data Disk (GB)', 'IP Private', 'Subnet mask', 'IP Public', 'Domain', 'Port', 'Network Policy Source', 'Destination', 'Method', 'Status'],
  ['web-prod-01', 'Web', 'Web Portal', 'Windows Server (BYOL)', 'VMware', 'Windows Server 2019', '4vCPU/16GB', '4', '16', 'SSD', '120', '0', '10.10.1.11', '255.255.255.0', '203.0.113.11', 'portal.example.go.th', '80,443', '0.0.0.0/0', '10.10.1.0/24', 'Hystax', 'Pending'],
]

const SERVICE_TEMPLATE = [
  ['Service Name', 'Service Type', 'Availability Zone', 'Topology', 'Algorithm', 'Protocol', 'Port', 'Spec', 'Members', 'Engine', 'Version', 'Plan', 'Storage (GB)', 'Storage Type', 'Bucket', 'Storage Class', 'Access', 'IP Private', 'IP Public', 'Endpoint', 'Note'],
  ['lb-web', 'Load Balancer', 'NCP-BKK Bangrak', 'HA', 'Round Robin', 'HTTPS', '443', '2vCPU/4GB', '10.10.1.11, 10.10.1.12', '', '', '', '', '', '', '', '', '10.10.1.5', '203.0.113.11', '', ''],
  ['db-mysql-prod', 'Database', 'NCP-BKK Bangrak', '', '', '', '', '', '', 'MySQL', '8.0', '4vCPU/16GB', '200', 'SSD', '', '', '', '10.10.1.6', '', '', ''],
  ['backup-store', 'Object Storage', '', '', '', '', '', '', '', '', '', '', '2000', '', 'gdcc-backup', 'Standard', 'Private', '', '', 'https://s3.nipa.cloud/gdcc-backup', ''],
]

export async function downloadWorkbookTemplate() {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(VM_TEMPLATE), 'List VM')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(SERVICE_TEMPLATE), 'Service')
  XLSX.writeFile(wb, 'migration-import-template.xlsx')
}
