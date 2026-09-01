// In dev, Vite proxies /api/* to the backend. In production, use VITE_AI_ENDPOINT.
const BASE = import.meta.env.VITE_AI_ENDPOINT?.replace(/\/api\/requirement-check\/?$/, '') || ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ---------- Customers ----------

export interface CustomerData {
  id?: string
  name: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  industry?: string
  note?: string
}

export const customersApi = {
  list: () => request<CustomerData[]>('/api/customers'),
  create: (data: CustomerData) => request<{ id: string }>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: CustomerData) => request<{ ok: boolean }>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/customers/${id}`, { method: 'DELETE' }),
}

// ---------- Team members ----------

export interface TeamMemberData {
  id?: string
  name: string
  role: string
  projects: string[]
}

export const teamApi = {
  list: () => request<TeamMemberData[]>('/api/team'),
  create: (data: TeamMemberData) => request<{ id: string }>('/api/team', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: TeamMemberData) => request<{ ok: boolean }>(`/api/team/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/team/${id}`, { method: 'DELETE' }),
}

// ---------- Projects ----------

export interface ProjectData {
  id?: string
  projectName: string
  customer?: string
  customerId?: string
  projectOwner: string
  projectStatus: string
  assets?: AssetData[]
  services?: ServiceData[]
  phases?: PhaseData[]
}

export interface AssetData {
  id?: string
  projectId?: string
  name: string
  role: string
  service: string
  license: string
  source: string
  os: string
  machineType: string
  vcpu: number
  ramGB: number
  storageType: string
  osDiskGB: number
  dataDiskGB: number
  ipAddress: string
  subnetMask: string
  ipPublic: string
  domain: string
  ports: string
  allowedSource: string
  policies?: { port: string; source: string; destination: string }[]
  method: string
  status: string
  destination?: string
  note?: string
}

export interface ServiceData {
  id?: string
  projectId?: string
  type: string
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

export interface PhaseData {
  id?: string
  projectId?: string
  phaseNumber?: number
  name: string
  mainActivity: string
  status?: boolean
  tasks?: TaskData[]
}

export interface TaskData {
  id?: string
  phaseId?: string
  description: string
  completed: boolean
}

export interface TemplateData {
  id?: string
  name: string
  description?: string
  builtIn?: boolean
  phases: { name: string; mainActivity: string; tasks: string[] }[]
}

export const projectsApi = {
  list: () => request<ProjectData[]>('/api/projects'),
  create: (data: { projectName: string; customerId: string; projectOwner: string; projectStatus: string }) =>
    request<{ id: string }>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { projectName: string; customerId: string; projectOwner: string; projectStatus: string }) =>
    request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
}

// ---------- Tasks ----------

export const tasksApi = {
  toggle: (projectId: string, phaseId: string, taskId: string, completed: boolean) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`, {
      method: 'PUT', body: JSON.stringify({ completed }),
    }),
  create: (projectId: string, phaseId: string, description: string) =>
    request<{ id: string }>(`/api/projects/${projectId}/phases/${phaseId}/tasks`, {
      method: 'POST', body: JSON.stringify({ description }),
    }),
  update: (projectId: string, phaseId: string, taskId: string, description: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`, {
      method: 'PUT', body: JSON.stringify({ description }),
    }),
  delete: (projectId: string, phaseId: string, taskId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`, { method: 'DELETE' }),
}

// ---------- Phases ----------

export const phasesApi = {
  create: (projectId: string, data: { name: string; mainActivity: string }) =>
    request<{ id: string; phaseNumber: number }>(`/api/projects/${projectId}/phases`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (projectId: string, phaseId: string, data: { name: string; mainActivity: string }) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/phases/${phaseId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  delete: (projectId: string, phaseId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/phases/${phaseId}`, { method: 'DELETE' }),
  move: (projectId: string, phaseId: string, to: number) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/phases/${phaseId}/move`, {
      method: 'PUT', body: JSON.stringify({ to }),
    }),
}

// ---------- Assets ----------

export const assetsApi = {
  create: (projectId: string, data: AssetData) =>
    request<{ id: string }>(`/api/projects/${projectId}/assets`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (projectId: string, assetId: string, data: AssetData) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/assets/${assetId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  delete: (projectId: string, assetId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/assets/${assetId}`, { method: 'DELETE' }),
  import: (projectId: string, assets: AssetData[], mode: 'append' | 'replace') =>
    request<{ ok: boolean; count: number }>(`/api/projects/${projectId}/import-assets`, {
      method: 'POST', body: JSON.stringify({ assets, mode }),
    }),
}

// ---------- Services ----------

export const servicesApi = {
  create: (projectId: string, data: ServiceData) =>
    request<{ id: string }>(`/api/projects/${projectId}/services`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (projectId: string, serviceId: string, data: ServiceData) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/services/${serviceId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  delete: (projectId: string, serviceId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/services/${serviceId}`, { method: 'DELETE' }),
  import: (projectId: string, services: ServiceData[], mode: 'append' | 'replace') =>
    request<{ ok: boolean; count: number }>(`/api/projects/${projectId}/import-services`, {
      method: 'POST', body: JSON.stringify({ services, mode }),
    }),
}

// ---------- Templates ----------

export const templatesApi = {
  list: () => request<TemplateData[]>('/api/templates'),
  create: (data: { name: string; description: string; phases: TemplateData['phases'] }) =>
    request<{ id: string }>('/api/templates', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/templates/${id}`, { method: 'DELETE' }),
}
