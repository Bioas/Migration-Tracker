import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { projects as seedProjects, customers as seedCustomers } from '../data/mockData'
import { Project, Phase, ProjectStatus, PhaseTemplate, Customer, Asset, Service } from '../types/project'

const STORAGE_KEY = 'migration-tracker:data:v2'
const LEGACY_TASK_KEY = 'migration-tracker:tasks:v1'
const TEMPLATES_KEY = 'migration-tracker:templates:v1'
const CUSTOMERS_KEY = 'migration-tracker:customers:v1'

/** Ships out of the box — the standard 6-phase migration runbook. */
const BUILTIN_TEMPLATES: PhaseTemplate[] = [
  {
    id: 'builtin-migration-runbook',
    name: 'Migration Runbook มาตรฐาน',
    description: 'แผนงาน Migrate & Implement VM Cloud Server 6 ขั้นตอน',
    builtIn: true,
    phases: (seedProjects[0]?.phases ?? []).map((ph) => ({
      name: ph.name,
      mainActivity: ph.mainActivity,
      tasks: ph.tasks.map((t) => t.description),
    })),
  },
]

function uid(prefix = 'id') {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rnd}`
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Ensure projects loaded from older storage have the new fields. */
function normalizeAsset(a: Partial<Asset> & { diskGB?: number }): Asset {
  return {
    id: a.id ?? uid('asset'),
    name: a.name ?? '',
    role: a.role ?? 'Other',
    service: a.service ?? '',
    license: a.license ?? '',
    source: a.source ?? 'Other',
    os: a.os ?? '',
    machineType: a.machineType ?? '',
    vcpu: Number(a.vcpu) || 0,
    ramGB: Number(a.ramGB) || 0,
    storageType: a.storageType ?? '',
    osDiskGB: Number(a.osDiskGB ?? a.diskGB) || 0,
    dataDiskGB: Number(a.dataDiskGB) || 0,
    ipAddress: a.ipAddress ?? '',
    subnetMask: a.subnetMask ?? '',
    ipPublic: a.ipPublic ?? '',
    domain: a.domain ?? '',
    ports: a.ports ?? '',
    allowedSource: a.allowedSource ?? '',
    policies: Array.isArray(a.policies)
      ? a.policies.map((r) => ({ port: r?.port ?? '', source: r?.source ?? '', destination: r?.destination ?? '' }))
      : undefined,
    method: a.method ?? 'Hystax',
    status: a.status ?? 'Pending',
    destination: a.destination,
    note: a.note ?? '',
  }
}

function normalizeProjects(list: Project[]): Project[] {
  return list.map((p) => ({
    ...p,
    assets: (Array.isArray(p.assets) ? p.assets : []).map(normalizeAsset),
    services: Array.isArray(p.services) ? p.services : [],
  }))
}

function seed(applyLegacy = true): Project[] {
  const base = normalizeProjects(clone(seedProjects) as Project[])
  if (applyLegacy) {
    try {
      const raw = localStorage.getItem(LEGACY_TASK_KEY)
      if (raw) {
        const map = JSON.parse(raw) as Record<string, boolean>
        for (const p of base)
          for (const ph of p.phases)
            for (const t of ph.tasks) if (t.id in map) t.completed = map[t.id]
      }
    } catch {
      /* ignore */
    }
  }
  return base
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeProjects(JSON.parse(raw) as Project[])
  } catch {
    /* corrupt storage → fall through to seed */
  }
  return seed()
}

function loadTemplates(): PhaseTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (raw) return JSON.parse(raw) as PhaseTemplate[]
  } catch {
    /* ignore */
  }
  return []
}

function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY)
    if (raw) return JSON.parse(raw) as Customer[]
  } catch {
    /* ignore */
  }
  return clone(seedCustomers)
}

export interface ProjectInput {
  projectName: string
  customerId: string | null
  projectOwner: string
  projectStatus: ProjectStatus
}

export interface PhaseInput {
  name: string
  mainActivity: string
}

export type CustomerInput = Omit<Customer, 'id'>
export type AssetInput = Omit<Asset, 'id'>
export type ServiceInput = Omit<Service, 'id'>

interface ProjectContextValue {
  projects: Project[]
  customers: Customer[]
  // task
  toggleTask: (taskId: string) => void
  addTask: (projectId: string, phaseId: string, description: string) => void
  updateTask: (projectId: string, phaseId: string, taskId: string, description: string) => void
  deleteTask: (projectId: string, phaseId: string, taskId: string) => void
  // phase
  addPhase: (projectId: string, data: PhaseInput) => void
  updatePhase: (projectId: string, phaseId: string, data: PhaseInput) => void
  deletePhase: (projectId: string, phaseId: string) => void
  movePhase: (projectId: string, from: number, to: number) => void
  moveTask: (projectId: string, phaseId: string, from: number, to: number) => void
  // asset
  addAsset: (projectId: string, data: AssetInput) => void
  updateAsset: (projectId: string, assetId: string, data: AssetInput) => void
  deleteAsset: (projectId: string, assetId: string) => void
  addService: (projectId: string, data: ServiceInput) => void
  updateService: (projectId: string, serviceId: string, data: ServiceInput) => void
  deleteService: (projectId: string, serviceId: string) => void
  importAssets: (projectId: string, assets: AssetInput[], mode: 'append' | 'replace') => void
  importServices: (projectId: string, services: ServiceInput[], mode: 'append' | 'replace') => void
  // project
  addProject: (data: ProjectInput) => string
  updateProject: (projectId: string, data: ProjectInput) => void
  deleteProject: (projectId: string) => void
  // customer
  addCustomer: (data: CustomerInput) => string
  updateCustomer: (customerId: string, data: CustomerInput) => void
  deleteCustomer: (customerId: string) => void
  // templates
  templates: PhaseTemplate[]
  saveTemplate: (name: string, description: string, phases: Phase[]) => string
  deleteTemplate: (templateId: string) => void
  applyTemplate: (projectId: string, templateId: string, mode: 'append' | 'replace') => void
  // misc
  resetAll: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<Project[]>(load)
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers)
  const [userTemplates, setUserTemplates] = useState<PhaseTemplate[]>(loadTemplates)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))
    } catch {
      /* storage unavailable */
    }
  }, [raw])

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers))
    } catch {
      /* storage unavailable */
    }
  }, [customers])

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(userTemplates))
    } catch {
      /* storage unavailable */
    }
  }, [userTemplates])

  const templates = useMemo<PhaseTemplate[]>(
    () => [...BUILTIN_TEMPLATES, ...userTemplates],
    [userTemplates]
  )

  const customersById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  )

  // Derived: phase.status = all tasks complete; customer name resolved from customerId
  const projects = useMemo<Project[]>(
    () =>
      raw.map((p) => ({
        ...p,
        assets: p.assets ?? [],
        customer: p.customerId ? customersById[p.customerId]?.name ?? p.customer : p.customer,
        phases: p.phases.map((ph) => ({
          ...ph,
          status: ph.tasks.length > 0 && ph.tasks.every((t) => t.completed),
        })),
      })),
    [raw, customersById]
  )

  const mapProject = useCallback(
    (projectId: string, fn: (p: Project) => Project) =>
      setRaw((prev) => prev.map((p) => (p.id === projectId ? fn(p) : p))),
    []
  )

  const mapPhase = useCallback(
    (projectId: string, phaseId: string, fn: (ph: Phase) => Phase) =>
      mapProject(projectId, (p) => ({
        ...p,
        phases: p.phases.map((ph) => (ph.id === phaseId ? fn(ph) : ph)),
      })),
    [mapProject]
  )

  // ---- Tasks ----
  const toggleTask = useCallback(
    (taskId: string) =>
      setRaw((prev) =>
        prev.map((p) => ({
          ...p,
          phases: p.phases.map((ph) => ({
            ...ph,
            tasks: ph.tasks.map((t) =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            ),
          })),
        }))
      ),
    []
  )

  const addTask = useCallback(
    (projectId: string, phaseId: string, description: string) => {
      const desc = description.trim()
      if (!desc) return
      mapPhase(projectId, phaseId, (ph) => ({
        ...ph,
        tasks: [...ph.tasks, { id: uid('task'), description: desc, completed: false }],
      }))
    },
    [mapPhase]
  )

  const updateTask = useCallback(
    (projectId: string, phaseId: string, taskId: string, description: string) => {
      const desc = description.trim()
      if (!desc) return
      mapPhase(projectId, phaseId, (ph) => ({
        ...ph,
        tasks: ph.tasks.map((t) => (t.id === taskId ? { ...t, description: desc } : t)),
      }))
    },
    [mapPhase]
  )

  const deleteTask = useCallback(
    (projectId: string, phaseId: string, taskId: string) =>
      mapPhase(projectId, phaseId, (ph) => ({
        ...ph,
        tasks: ph.tasks.filter((t) => t.id !== taskId),
      })),
    [mapPhase]
  )

  // ---- Phases ----
  const addPhase = useCallback(
    (projectId: string, data: PhaseInput) =>
      mapProject(projectId, (p) => {
        const phaseNumber = p.phases.reduce((m, ph) => Math.max(m, ph.phaseNumber), 0) + 1
        const phase: Phase = {
          id: uid('phase'),
          phaseNumber,
          name: data.name.trim(),
          mainActivity: data.mainActivity.trim(),
          tasks: [],
          status: false,
        }
        return { ...p, phases: [...p.phases, phase] }
      }),
    [mapProject]
  )

  const updatePhase = useCallback(
    (projectId: string, phaseId: string, data: PhaseInput) =>
      mapPhase(projectId, phaseId, (ph) => ({
        ...ph,
        name: data.name.trim(),
        mainActivity: data.mainActivity.trim(),
      })),
    [mapPhase]
  )

  const deletePhase = useCallback(
    (projectId: string, phaseId: string) =>
      mapProject(projectId, (p) => ({
        ...p,
        phases: p.phases
          .filter((ph) => ph.id !== phaseId)
          .map((ph, i) => ({ ...ph, phaseNumber: i + 1 })),
      })),
    [mapProject]
  )

  const movePhase = useCallback(
    (projectId: string, from: number, to: number) =>
      mapProject(projectId, (p) => ({
        ...p,
        phases: arrayMove(p.phases, from, to).map((ph, i) => ({
          ...ph,
          phaseNumber: i + 1,
        })),
      })),
    [mapProject]
  )

  const moveTask = useCallback(
    (projectId: string, phaseId: string, from: number, to: number) =>
      mapPhase(projectId, phaseId, (ph) => ({
        ...ph,
        tasks: arrayMove(ph.tasks, from, to),
      })),
    [mapPhase]
  )

  // ---- Assets ----
  const addAsset = useCallback(
    (projectId: string, data: AssetInput) =>
      mapProject(projectId, (p) => ({
        ...p,
        assets: [...(p.assets ?? []), { ...data, id: uid('asset') }],
      })),
    [mapProject]
  )

  const updateAsset = useCallback(
    (projectId: string, assetId: string, data: AssetInput) =>
      mapProject(projectId, (p) => ({
        ...p,
        assets: (p.assets ?? []).map((a) => (a.id === assetId ? { ...data, id: assetId } : a)),
      })),
    [mapProject]
  )

  const deleteAsset = useCallback(
    (projectId: string, assetId: string) =>
      mapProject(projectId, (p) => ({
        ...p,
        assets: (p.assets ?? []).filter((a) => a.id !== assetId),
      })),
    [mapProject]
  )

  const addService = useCallback(
    (projectId: string, data: ServiceInput) =>
      mapProject(projectId, (p) => ({
        ...p,
        services: [...(p.services ?? []), { ...data, id: uid('svc') }],
      })),
    [mapProject]
  )

  const updateService = useCallback(
    (projectId: string, serviceId: string, data: ServiceInput) =>
      mapProject(projectId, (p) => ({
        ...p,
        services: (p.services ?? []).map((sv) => (sv.id === serviceId ? { ...data, id: serviceId } : sv)),
      })),
    [mapProject]
  )

  const deleteService = useCallback(
    (projectId: string, serviceId: string) =>
      mapProject(projectId, (p) => ({
        ...p,
        services: (p.services ?? []).filter((sv) => sv.id !== serviceId),
      })),
    [mapProject]
  )

  const importAssets = useCallback(
    (projectId: string, assets: AssetInput[], mode: 'append' | 'replace') =>
      mapProject(projectId, (p) => {
        const created = assets.map((a) => ({ ...a, id: uid('asset') }))
        return { ...p, assets: mode === 'replace' ? created : [...(p.assets ?? []), ...created] }
      }),
    [mapProject]
  )

  const importServices = useCallback(
    (projectId: string, services: ServiceInput[], mode: 'append' | 'replace') =>
      mapProject(projectId, (p) => {
        const created = services.map((s) => ({ ...s, id: uid('svc') }))
        return { ...p, services: mode === 'replace' ? created : [...(p.services ?? []), ...created] }
      }),
    [mapProject]
  )

  // ---- Projects ----
  const addProject = useCallback(
    (data: ProjectInput) => {
      const id = uid('proj')
      const snapshot = data.customerId ? customers.find((c) => c.id === data.customerId)?.name ?? '' : ''
      setRaw((prev) => [
        ...prev,
        {
          id,
          projectName: data.projectName.trim(),
          customer: snapshot,
          customerId: data.customerId ?? undefined,
          projectOwner: data.projectOwner.trim(),
          projectStatus: data.projectStatus,
          phases: [],
          assets: [],
        services: [],
        },
      ])
      return id
    },
    [customers]
  )

  const updateProject = useCallback(
    (projectId: string, data: ProjectInput) => {
      const snapshot = data.customerId ? customers.find((c) => c.id === data.customerId)?.name ?? '' : ''
      mapProject(projectId, (p) => ({
        ...p,
        projectName: data.projectName.trim(),
        customer: snapshot || p.customer,
        customerId: data.customerId ?? undefined,
        projectOwner: data.projectOwner.trim(),
        projectStatus: data.projectStatus,
      }))
    },
    [mapProject, customers]
  )

  const deleteProject = useCallback(
    (projectId: string) => setRaw((prev) => prev.filter((p) => p.id !== projectId)),
    []
  )

  // ---- Customers ----
  const addCustomer = useCallback((data: CustomerInput) => {
    const id = uid('cust')
    setCustomers((prev) => [...prev, { ...data, id, name: data.name.trim() }])
    return id
  }, [])

  const updateCustomer = useCallback(
    (customerId: string, data: CustomerInput) =>
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...data, id: customerId, name: data.name.trim() } : c))
      ),
    []
  )

  const deleteCustomer = useCallback((customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId))
    // unlink projects that referenced the deleted customer (keep denormalized name)
    setRaw((prev) =>
      prev.map((p) => (p.customerId === customerId ? { ...p, customerId: undefined } : p))
    )
  }, [])

  // ---- Templates ----
  const saveTemplate = useCallback((name: string, description: string, phases: Phase[]) => {
    const id = uid('tpl')
    const tpl: PhaseTemplate = {
      id,
      name: name.trim() || 'Template',
      description: description.trim() || undefined,
      phases: phases.map((ph) => ({
        name: ph.name,
        mainActivity: ph.mainActivity,
        tasks: ph.tasks.map((t) => t.description),
      })),
    }
    setUserTemplates((prev) => [...prev, tpl])
    return id
  }, [])

  const deleteTemplate = useCallback(
    (templateId: string) =>
      setUserTemplates((prev) => prev.filter((t) => t.id !== templateId)),
    []
  )

  const applyTemplate = useCallback(
    (projectId: string, templateId: string, mode: 'append' | 'replace') => {
      const tpl = templates.find((t) => t.id === templateId)
      if (!tpl) return
      const newPhases: Phase[] = tpl.phases.map((tp) => ({
        id: uid('phase'),
        phaseNumber: 0,
        name: tp.name,
        mainActivity: tp.mainActivity,
        status: false,
        tasks: tp.tasks.map((d) => ({ id: uid('task'), description: d, completed: false })),
      }))
      mapProject(projectId, (p) => {
        const combined = mode === 'replace' ? newPhases : [...p.phases, ...newPhases]
        return { ...p, phases: combined.map((ph, i) => ({ ...ph, phaseNumber: i + 1 })) }
      })
    },
    [templates, mapProject]
  )

  const resetAll = useCallback(() => {
    setRaw(seed(false))
    setCustomers(clone(seedCustomers))
  }, [])

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      customers,
      toggleTask,
      addTask,
      updateTask,
      deleteTask,
      addPhase,
      updatePhase,
      deletePhase,
      movePhase,
      moveTask,
      addAsset,
      updateAsset,
      deleteAsset,
      importAssets,
      importServices,
      addService,
      updateService,
      deleteService,
      addProject,
      updateProject,
      deleteProject,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      templates,
      saveTemplate,
      deleteTemplate,
      applyTemplate,
      resetAll,
    }),
    [
      projects,
      customers,
      toggleTask,
      addTask,
      updateTask,
      deleteTask,
      addPhase,
      updatePhase,
      deletePhase,
      movePhase,
      moveTask,
      addAsset,
      updateAsset,
      deleteAsset,
      importAssets,
      importServices,
      addService,
      updateService,
      deleteService,
      addProject,
      updateProject,
      deleteProject,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      templates,
      saveTemplate,
      deleteTemplate,
      applyTemplate,
      resetAll,
    ]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used within a ProjectProvider')
  return ctx
}
