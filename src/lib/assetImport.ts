import { AssetInput } from '../store/ProjectStore'
import { AssetRole, AssetSource, AssetStatus, MigrationMethod } from '../types/project'

const ROLES: AssetRole[] = ['Web', 'App', 'Database', 'Firewall', 'Load Balancer', 'Other']
const SOURCES: AssetSource[] = ['VMware', 'Hyper-V', 'AWS', 'Azure', 'GCP', 'Bare Metal', 'Other']
const METHODS: MigrationMethod[] = ['Hystax', 'Rebuild', 'Manual', 'Other']
const STATUSES: AssetStatus[] = ['Pending', 'Replicating', 'Testing', 'Migrated', 'Failed']

const DEFAULT_ASSET: AssetInput = {
  name: '', role: 'Other', service: '', license: '', source: 'Other', os: '',
  machineType: '', vcpu: 0, ramGB: 0, storageType: '', osDiskGB: 0, dataDiskGB: 0,
  ipAddress: '', subnetMask: '', ipPublic: '', domain: '', ports: '', allowedSource: '',
  method: 'Hystax', status: 'Pending', destination: '', note: '',
}

type Field = keyof AssetInput

// Priority order — specific headers matched before generic ones
const FIELD_ALIASES: [Field, string[]][] = [
  ['name', ['vmname', 'vm name', 'hostname', 'host name', 'machine name', 'ชื่อ']],
  ['service', ['service', 'บริการ']],
  ['license', ['license', 'licence', 'ลิขสิทธิ์']],
  ['machineType', ['machine type', 'flavor', 'instance type']],
  ['vcpu', ['vcpu', 'cpu', 'core']],
  ['ramGB', ['ram', 'memory', 'mem']],
  ['storageType', ['storage type', 'disk type']],
  ['osDiskGB', ['os disk', 'system disk']],
  ['dataDiskGB', ['data disk']],
  ['role', ['type', 'role', 'ประเภท', 'บทบาท']],
  ['os', ['operating system', 'ระบบปฏิบัติการ', 'os']],
  ['subnetMask', ['subnet', 'netmask']],
  ['ipPublic', ['ip public', 'public ip']],
  ['domain', ['domain', 'โดเมน', 'fqdn']],
  ['ports', ['port']],
  ['allowedSource', ['network policy', 'allowed source', 'source ip', 'source']],
  ['ipAddress', ['ip private', 'private ip', 'ip address', 'ipaddress', 'ip']],
  ['destination', ['destination', 'ปลายทาง', 'dest']],
  ['method', ['migrate method', 'method', 'วิธี']],
  ['status', ['status', 'สถานะ']],
]

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

function matchField(header: string): Field | null {
  const h = norm(header)
  if (!h) return null
  for (const [field, aliases] of FIELD_ALIASES) {
    if (aliases.some((a) => h.includes(a))) return field
  }
  return null
}

export interface ParsedRow {
  index: number
  asset: AssetInput
  errors: string[]
  warnings: string[]
}

export interface ParseResult {
  rows: ParsedRow[]
  mappedFields: Field[]
  headerFound: boolean
}

function pickEnum<T extends string>(raw: string, allowed: T[], fallback: T, warns: string[], label: string): T {
  const v = raw.trim()
  if (!v) return fallback
  const hit = allowed.find((a) => a.toLowerCase() === v.toLowerCase())
  if (hit) return hit
  warns.push(`${label} "${v}" ไม่ตรงค่าที่รองรับ ใช้ค่า "${fallback}"`)
  return fallback
}

function toNum(raw: string, warns: string[], label: string): number {
  if (!raw.trim()) return 0
  const n = Number(String(raw).replace(/[, ]+/g, ''))
  if (Number.isNaN(n)) {
    warns.push(`${label} "${raw}" ไม่ใช่ตัวเลข`)
    return 0
  }
  return n
}

export function parseMatrix(matrix: unknown[][]): ParseResult {
  // find the header row = row with the most recognizable field headers
  let headerRowIndex = -1
  let best = 0
  const scan = Math.min(matrix.length, 15)
  for (let i = 0; i < scan; i++) {
    const matched = new Set<Field>()
    for (const cell of matrix[i] ?? []) {
      const f = matchField(String(cell ?? ''))
      if (f) matched.add(f)
    }
    if (matched.size > best) {
      best = matched.size
      headerRowIndex = i
    }
  }
  if (headerRowIndex < 0 || best < 2) return { rows: [], mappedFields: [], headerFound: false }

  const cols: Partial<Record<Field, number>> = {}
  ;(matrix[headerRowIndex] ?? []).forEach((cell, idx) => {
    const f = matchField(String(cell ?? ''))
    if (f && cols[f] === undefined) cols[f] = idx
  })

  const get = (row: unknown[], f: Field) =>
    cols[f] !== undefined ? String(row[cols[f]!] ?? '').trim() : ''

  const rows: ParsedRow[] = []
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const row = matrix[i] ?? []
    if (row.every((c) => String(c ?? '').trim() === '')) continue // skip blank
    const errors: string[] = []
    const warnings: string[] = []
    const name = get(row, 'name')
    if (!name) errors.push('ไม่มีชื่อเครื่อง (VMName)')

    const asset: AssetInput = {
      ...DEFAULT_ASSET,
      name,
      role: pickEnum(get(row, 'role'), ROLES, 'Other', warnings, 'Type'),
      service: get(row, 'service'),
      license: get(row, 'license'),
      source: pickEnum(get(row, 'source'), SOURCES, 'Other', warnings, 'Source'),
      os: get(row, 'os'),
      machineType: get(row, 'machineType'),
      vcpu: toNum(get(row, 'vcpu'), warnings, 'vCPU'),
      ramGB: toNum(get(row, 'ramGB'), warnings, 'RAM'),
      storageType: get(row, 'storageType'),
      osDiskGB: toNum(get(row, 'osDiskGB'), warnings, 'OS Disk'),
      dataDiskGB: toNum(get(row, 'dataDiskGB'), warnings, 'Data Disk'),
      ipAddress: get(row, 'ipAddress'),
      subnetMask: get(row, 'subnetMask'),
      ipPublic: get(row, 'ipPublic'),
      domain: get(row, 'domain'),
      ports: get(row, 'ports'),
      allowedSource: get(row, 'allowedSource'),
      destination: get(row, 'destination'),
      method: pickEnum(get(row, 'method'), METHODS, 'Hystax', warnings, 'Method'),
      status: pickEnum(get(row, 'status'), STATUSES, 'Pending', warnings, 'Status'),
      note: '',
    }
    rows.push({ index: rows.length + 1, asset, errors, warnings })
  }

  return { rows, mappedFields: Object.keys(cols) as Field[], headerFound: true }
}
