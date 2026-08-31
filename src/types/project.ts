export interface Task {
  id: string
  description: string
  completed: boolean
}

export interface Phase {
  id: string
  phaseNumber: number
  name: string
  mainActivity: string
  tasks: Task[]
  status: boolean
  plannedStart?: string
  plannedEnd?: string
  remark?: string
}

export type ProjectStatus = 'Active' | 'On Hold' | 'Completed' | 'Cancelled'

export interface Customer {
  id: string
  name: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  industry?: string
  note?: string
}

export type AssetSource =
  | 'VMware'
  | 'Hyper-V'
  | 'AWS'
  | 'Azure'
  | 'GCP'
  | 'Bare Metal'
  | 'Other'

export type MigrationMethod = 'Hystax' | 'Rebuild' | 'Manual' | 'Other'

export type AssetStatus =
  | 'Pending'
  | 'Replicating'
  | 'Testing'
  | 'Migrated'
  | 'Failed'

export type AssetRole =
  | 'Web'
  | 'App'
  | 'Database'
  | 'Firewall'
  | 'Load Balancer'
  | 'Other'

/** One firewall/network-policy rule: which port is opened from where to where. */
export interface NetworkPolicyRule {
  port: string
  source: string
  destination: string
}

/** A VM / server to be migrated — mirrors the customer intake inventory sheet. */
export interface Asset {
  id: string
  name: string // VMName / Hostname
  role: AssetRole // Type (web / db / firewall ...)
  service: string // Service running on the VM
  license: string // License (OS/DB/App)
  source: AssetSource // ต้นทาง (cloud / on-prem)
  os: string
  machineType: string // flavor / instance type
  vcpu: number
  ramGB: number
  storageType: string // e.g. SSD / Premium
  osDiskGB: number
  dataDiskGB: number
  // Network
  ipAddress: string // IP Private
  subnetMask: string
  ipPublic: string
  domain: string
  ports: string
  allowedSource: string // Network Policy — approved source IP/CIDR
  /** Network Policy rules (many). Legacy ports/allowedSource/destination hold a summary. */
  policies?: NetworkPolicyRule[]
  // Migration
  method: MigrationMethod
  status: AssetStatus
  destination?: string
  note?: string
}

/** Read an asset's policy rules, falling back to the legacy single fields. */
export function assetPolicies(a: Asset): NetworkPolicyRule[] {
  if (Array.isArray(a.policies) && a.policies.length > 0) return a.policies
  if ((a.ports ?? '') === '' && (a.allowedSource ?? '') === '' && (a.destination ?? '') === '') return []
  return [{ port: a.ports ?? '', source: a.allowedSource ?? '', destination: a.destination ?? '' }]
}

export type ServiceType = 'Load Balancer' | 'Database' | 'Object Storage'

/** NIPA add-on service instance attached to a project. */
export interface Service {
  id: string
  type: ServiceType
  name: string
  algorithm?: string
  protocol?: string
  port?: string
  members?: string
  engine?: string
  version?: string
  plan?: string
  ha?: boolean
  bucket?: string
  storageClass?: string
  access?: string
  capacityGB?: number
  endpoint?: string
  ipPublic?: string
  ipPrivate?: string
  availabilityZone?: string
  topology?: string
  spec?: string
  storageType?: string
  note?: string
}

export interface Project {
  id: string
  projectName: string
  customer: string
  customerId?: string
  projectOwner: string
  projectStatus: ProjectStatus
  phases: Phase[]
  assets: Asset[]
  services: Service[]
  plannedStart?: string
  plannedEnd?: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  projects: string[]
}

export interface TemplatePhase {
  name: string
  mainActivity: string
  tasks: string[]
}

export interface PhaseTemplate {
  id: string
  name: string
  description?: string
  builtIn?: boolean
  phases: TemplatePhase[]
}
