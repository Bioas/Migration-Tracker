import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  projectsApi,
  customersApi,
  tasksApi,
  phasesApi,
  assetsApi,
  servicesApi,
  templatesApi,
  teamApi,
} from '../lib/api'
import { Project, Phase, ProjectStatus, PhaseTemplate, Customer, Asset, Service , TeamMember, ProjectSolution, ConnectNetwork } from '../types/project'

// ---------- helpers ----------

function uid(prefix = 'id') {
  // crypto.randomUUID มีเฉพาะใน secure context (HTTPS หรือ localhost)
  // เข้าผ่าน http บน IP จะไม่มีให้ใช้ ต้อง fallback ไม่งั้นทั้งหน้าพัง
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

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

function normalizePhase(ph: any): Phase {
  return {
    id: ph.id,
    phaseNumber: ph.phaseNumber ?? 0,
    name: ph.name ?? '',
    mainActivity: ph.mainActivity ?? '',
    status: ph.status ?? false,
    plannedStart: ph.plannedStart,
    plannedEnd: ph.plannedEnd,
    remark: ph.remark,
    tasks: (ph.tasks ?? []).map((t: any) => ({
      id: t.id,
      description: t.description ?? '',
      completed: !!t.completed,
    })),
  }
}

function normalizeProject(p: any): Project {
  return {
    id: p.id,
    projectName: p.projectName ?? '',
    customer: p.customer ?? '',
    customerId: p.customerId ?? '',
    projectOwner: p.projectOwner ?? '',
    projectStatus: (p.projectStatus ?? 'Active') as ProjectStatus,
    // DB เก็บ '' เมื่อยังไม่ได้ระบุ — แปลงเป็น undefined ให้ฝั่ง UI เช็คง่าย
    solution: (p.solution || undefined) as ProjectSolution | undefined,
    connectNetwork: (p.connectNetwork || undefined) as ConnectNetwork | undefined,
    documentUrl: p.documentUrl || undefined,
    phases: (p.phases ?? []).map(normalizePhase),
    assets: (p.assets ?? []).map(normalizeAsset),
    services: (p.services ?? []).map((s: any) => ({
      id: s.id,
      type: s.type ?? 'Load Balancer',
      name: s.name ?? '',
      algorithm: s.algorithm,
      protocol: s.protocol,
      port: s.port,
      members: s.members,
      engine: s.engine,
      version: s.version,
      plan: s.plan,
      ha: s.ha,
      bucket: s.bucket,
      storageClass: s.storageClass,
      access: s.access,
      capacityGB: s.capacityGB,
      endpoint: s.endpoint,
      ipPublic: s.ipPublic,
      ipPrivate: s.ipPrivate,
      availabilityZone: s.availabilityZone,
      topology: s.topology,
      spec: s.spec,
      storageType: s.storageType,
      note: s.note,
    })),
    plannedStart: p.plannedStart,
    plannedEnd: p.plannedEnd,
  }
}

function normalizeTemplate(t: any): PhaseTemplate {
  return {
    id: t.id,
    name: t.name ?? '',
    description: t.description,
    builtIn: t.builtIn,
    phases: (t.phases ?? []).map((ph: any) => ({
      name: ph.name ?? '',
      mainActivity: ph.mainActivity ?? '',
      tasks: ph.tasks ?? [],
    })),
  }
}

// ---------- Context ----------

export interface ProjectInput {
  projectName: string
  customerId: string | null
  projectOwner: string
  projectStatus: ProjectStatus
  /** '' = ยังไม่ระบุ */
  solution: ProjectSolution | ''
  /** '' = ยังไม่ระบุ */
  connectNetwork: ConnectNetwork | ''
  /** ลิงก์ไปเอกสารต้นทาง — '' = ยังไม่ระบุ */
  documentUrl: string
}

export interface PhaseInput {
  name: string
  mainActivity: string
}

export type CustomerInput = Omit<Customer, 'id'>
export type TeamMemberInput = Omit<TeamMember, 'id'>
export type AssetInput = Omit<Asset, 'id'>
export type ServiceInput = Omit<Service, 'id'>

interface ProjectContextValue {
  projects: Project[]
  customers: Customer[]
  loading: boolean
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
  // team
  teamMembers: TeamMember[]
  addTeamMember: (data: TeamMemberInput) => void
  updateTeamMember: (memberId: string, data: TeamMemberInput) => void
  deleteTeamMember: (memberId: string) => void
  /** ตั้งว่าสมาชิก (ตามชื่อ) ดูแลโปรเจกต์ใดบ้าง โดยเขียนลง projectOwner */
  setMemberProjects: (memberName: string, projectIds: string[]) => void
  addCustomer: (data: CustomerInput) => string
  updateCustomer: (customerId: string, data: CustomerInput) => void
  deleteCustomer: (customerId: string) => void
  // templates
  templates: PhaseTemplate[]
  saveTemplate: (name: string, description: string, phases: Phase[]) => string
  updateTemplate: (templateId: string, name: string, description: string) => void
  deleteTemplate: (templateId: string) => void
  applyTemplate: (projectId: string, templateId: string, mode: 'append' | 'replace') => void
  // misc
  resetAll: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allTemplates, setAllTemplates] = useState<PhaseTemplate[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // ---------- Initial load from API ----------

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [projData, custData, tplData, teamData] = await Promise.all([
          projectsApi.list(),
          customersApi.list(),
          templatesApi.list(),
          teamApi.list(),
        ])
        if (cancelled) return
        setProjects(projData.map(normalizeProject))
        setCustomers(custData.map((c) => ({
          id: c.id!, name: c.name, contactName: c.contactName, contactEmail: c.contactEmail,
          contactPhone: c.contactPhone, industry: c.industry, note: c.note,
        })))
        setAllTemplates(tplData.map(normalizeTemplate))
        setTeamMembers(teamData.map((m) => ({ id: m.id!, name: m.name, role: m.role, projects: m.projects ?? [] })))
      } catch (err) {
        console.error('[ProjectStore] Failed to load from API:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ---------- Derived ----------

  const templates = useMemo<PhaseTemplate[]>(() => allTemplates, [allTemplates])

  const customersById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  )

  // ---------- Helpers ----------

  const reloadAll = useCallback(async () => {
    const [projData, custData] = await Promise.all([projectsApi.list(), customersApi.list()])
    setProjects(projData.map(normalizeProject))
    setCustomers(custData.map((c) => ({
      id: c.id!, name: c.name, contactName: c.contactName, contactEmail: c.contactEmail,
      contactPhone: c.contactPhone, industry: c.industry, note: c.note,
    })))
  }, [])

  /** Optimistic local update: apply fn to the raw project list, then refetch from server. */
  const mutateProjects = useCallback(
    (fn: (prev: Project[]) => Project[]) => {
      setProjects(fn)
    },
    [],
  )

  // ---------- Tasks ----------

  const toggleTask = useCallback(
    (taskId: string) => {
      // find current state optimistically
      setProjects((prev) => {
        for (const p of prev) {
          for (const ph of p.phases) {
            const t = ph.tasks.find((t) => t.id === taskId)
            if (t) {
              // fire API call
              tasksApi.toggle(p.id, ph.id, taskId, !t.completed).catch(console.error)
              return prev.map((pp) => ({
                ...pp,
                phases: pp.phases.map((pph) => ({
                  ...pph,
                  tasks: pph.tasks.map((tt) => (tt.id === taskId ? { ...tt, completed: !tt.completed } : tt)),
                })),
              }))
            }
          }
        }
        return prev
      })
    },
    [],
  )

  const addTask = useCallback(
    (projectId: string, phaseId: string, description: string) => {
      const desc = description.trim()
      if (!desc) return
      tasksApi.create(projectId, phaseId, desc).then(({ id }) => {
        mutateProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, phases: p.phases.map((ph) => (ph.id === phaseId ? { ...ph, tasks: [...ph.tasks, { id, description: desc, completed: false }] } : ph)) }
              : p,
          ),
        )
      }).catch(console.error)
    },
    [mutateProjects],
  )

  const updateTask = useCallback(
    (projectId: string, phaseId: string, taskId: string, description: string) => {
      const desc = description.trim()
      if (!desc) return
      tasksApi.update(projectId, phaseId, taskId, desc).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, phases: p.phases.map((ph) => (ph.id === phaseId ? { ...ph, tasks: ph.tasks.map((t) => (t.id === taskId ? { ...t, description: desc } : t)) } : ph)) }
            : p,
        ),
      )
    },
    [mutateProjects],
  )

  const deleteTask = useCallback(
    (projectId: string, phaseId: string, taskId: string) => {
      tasksApi.delete(projectId, phaseId, taskId).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, phases: p.phases.map((ph) => (ph.id === phaseId ? { ...ph, tasks: ph.tasks.filter((t) => t.id !== taskId) } : ph)) }
            : p,
        ),
      )
    },
    [mutateProjects],
  )

  // ---------- Phases ----------

  const addPhase = useCallback(
    (projectId: string, data: PhaseInput) => {
      phasesApi.create(projectId, data).then(({ id, phaseNumber }) => {
        mutateProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, phases: [...p.phases, { id, phaseNumber, name: data.name, mainActivity: data.mainActivity, status: false, tasks: [] }] }
              : p,
          ),
        )
      }).catch(console.error)
      // optimistic
      mutateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p
          const maxNum = p.phases.reduce((m, ph) => Math.max(m, ph.phaseNumber), 0) + 1
          return { ...p, phases: [...p.phases, { id: uid('phase'), phaseNumber: maxNum, name: data.name, mainActivity: data.mainActivity, status: false, tasks: [] }] }
        }),
      )
    },
    [mutateProjects],
  )

  const updatePhase = useCallback(
    (projectId: string, phaseId: string, data: PhaseInput) => {
      phasesApi.update(projectId, phaseId, data).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, phases: p.phases.map((ph) => (ph.id === phaseId ? { ...ph, name: data.name, mainActivity: data.mainActivity } : ph)) }
            : p,
        ),
      )
    },
    [mutateProjects],
  )

  const deletePhase = useCallback(
    (projectId: string, phaseId: string) => {
      phasesApi.delete(projectId, phaseId).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, phases: p.phases.filter((ph) => ph.id !== phaseId).map((ph, i) => ({ ...ph, phaseNumber: i + 1 })) }
            : p,
        ),
      )
    },
    [mutateProjects],
  )

  const movePhase = useCallback(
    (projectId: string, from: number, to: number) => {
      phasesApi.move(projectId, projects.find((p) => p.id === projectId)?.phases[from]?.id ?? '', to).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p
          const arr = [...p.phases]
          const [item] = arr.splice(from, 1)
          arr.splice(to, 0, item)
          return { ...p, phases: arr.map((ph, i) => ({ ...ph, phaseNumber: i + 1 })) }
        }),
      )
    },
    [mutateProjects, projects],
  )

  const moveTask = useCallback(
    (projectId: string, phaseId: string, from: number, to: number) => {
      mutateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p
          return {
            ...p,
            phases: p.phases.map((ph) => {
              if (ph.id !== phaseId) return ph
              const arr = [...ph.tasks]
              const [item] = arr.splice(from, 1)
              arr.splice(to, 0, item)
              return { ...ph, tasks: arr }
            }),
          }
        }),
      )
    },
    [mutateProjects],
  )

  // ---------- Assets ----------

  const addAsset = useCallback(
    (projectId: string, data: AssetInput) => {
      assetsApi.create(projectId, data).then(({ id }) => {
        mutateProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, assets: [...p.assets, { ...data, id }] } : p)),
        )
      }).catch(console.error)
      // optimistic
      const tempId = uid('asset')
      mutateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, assets: [...p.assets, { ...data, id: tempId }] } : p)),
      )
    },
    [mutateProjects],
  )

  const updateAsset = useCallback(
    (projectId: string, assetId: string, data: AssetInput) => {
      assetsApi.update(projectId, assetId, data).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, assets: p.assets.map((a) => (a.id === assetId ? { ...data, id: assetId } : a)) } : p)),
      )
    },
    [mutateProjects],
  )

  const deleteAsset = useCallback(
    (projectId: string, assetId: string) => {
      assetsApi.delete(projectId, assetId).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, assets: p.assets.filter((a) => a.id !== assetId) } : p)),
      )
    },
    [mutateProjects],
  )

  const addService = useCallback(
    (projectId: string, data: ServiceInput) => {
      servicesApi.create(projectId, data).then(({ id }) => {
        mutateProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, services: [...p.services, { ...data, id }] } : p)),
        )
      }).catch(console.error)
      const tempId = uid('svc')
      mutateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, services: [...p.services, { ...data, id: tempId }] } : p)),
      )
    },
    [mutateProjects],
  )

  const updateService = useCallback(
    (projectId: string, serviceId: string, data: ServiceInput) => {
      servicesApi.update(projectId, serviceId, data).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, services: p.services.map((s) => (s.id === serviceId ? { ...data, id: serviceId } : s)) } : p)),
      )
    },
    [mutateProjects],
  )

  const deleteService = useCallback(
    (projectId: string, serviceId: string) => {
      servicesApi.delete(projectId, serviceId).catch(console.error)
      mutateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, services: p.services.filter((s) => s.id !== serviceId) } : p)),
      )
    },
    [mutateProjects],
  )

  const importAssets = useCallback(
    (projectId: string, assets: AssetInput[], mode: 'append' | 'replace') => {
      assetsApi.import(projectId, assets, mode).then(() => reloadAll()).catch(console.error)
    },
    [reloadAll],
  )

  const importServices = useCallback(
    (projectId: string, services: ServiceInput[], mode: 'append' | 'replace') => {
      servicesApi.import(projectId, services, mode).then(() => reloadAll()).catch(console.error)
    },
    [reloadAll],
  )

  // ---------- Projects ----------

  const addProject = useCallback(
    (data: ProjectInput) => {
      const id = uid('proj')
      projectsApi.create({
        projectName: data.projectName,
        customerId: data.customerId ?? '',
        projectOwner: data.projectOwner,
        projectStatus: data.projectStatus,
        solution: data.solution,
        connectNetwork: data.connectNetwork,
        documentUrl: data.documentUrl,
      }).then(() => reloadAll()).catch(console.error)
      // optimistic
      const cust = data.customerId ? customersById[data.customerId]?.name ?? '' : ''
      mutateProjects((prev) => [
        ...prev,
        { id, projectName: data.projectName, customer: cust, customerId: data.customerId ?? undefined, projectOwner: data.projectOwner, projectStatus: data.projectStatus, solution: data.solution || undefined, connectNetwork: data.connectNetwork || undefined, documentUrl: data.documentUrl || undefined, phases: [], assets: [], services: [] },
      ])
      return id
    },
    [customersById, mutateProjects, reloadAll],
  )

  const updateProject = useCallback(
    (projectId: string, data: ProjectInput) => {
      projectsApi.update(projectId, {
        projectName: data.projectName,
        customerId: data.customerId ?? '',
        projectOwner: data.projectOwner,
        projectStatus: data.projectStatus,
        solution: data.solution,
        connectNetwork: data.connectNetwork,
        documentUrl: data.documentUrl,
      }).then(() => reloadAll()).catch(console.error)
      const cust = data.customerId ? customersById[data.customerId]?.name ?? '' : ''
      mutateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, projectName: data.projectName, customer: cust, customerId: data.customerId ?? undefined, projectOwner: data.projectOwner, projectStatus: data.projectStatus, solution: data.solution || undefined, connectNetwork: data.connectNetwork || undefined, documentUrl: data.documentUrl || undefined } : p)),
      )
    },
    [customersById, mutateProjects, reloadAll],
  )

  const deleteProject = useCallback(
    (projectId: string) => {
      projectsApi.delete(projectId).catch(console.error)
      mutateProjects((prev) => prev.filter((p) => p.id !== projectId))
    },
    [mutateProjects],
  )

  // ---------- Customers ----------

  // ใส่แถวชั่วคราวก่อนให้ UI ตอบสนองทันที แล้วสลับเป็น id จริงเมื่อ server ตอบ
  // (ถ้าสร้าง id เองฝั่ง client จะไม่ตรงกับใน DB แล้วแก้/ลบไม่ได้จนกว่าจะ reload)
  const addTeamMember = useCallback((data: TeamMemberInput) => {
    const tempId = uid('tm-temp')
    setTeamMembers((prev) => [...prev, { ...data, id: tempId }])
    teamApi
      .create(data)
      .then(({ id }) => setTeamMembers((prev) => prev.map((m) => (m.id === tempId ? { ...m, id } : m))))
      .catch((err) => {
        console.error(err)
        setTeamMembers((prev) => prev.filter((m) => m.id !== tempId))
      })
  }, [])

  const updateTeamMember = useCallback((memberId: string, data: TeamMemberInput) => {
    teamApi.update(memberId, data).catch(console.error)
    setTeamMembers((prev) => prev.map((m) => (m.id === memberId ? { ...data, id: memberId } : m)))
  }, [])

  const deleteTeamMember = useCallback((memberId: string) => {
    teamApi.delete(memberId).catch(console.error)
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
  }, [])

  // ตั้ง projectOwner ให้ตรงกับที่เลือกในหน้าทีมงาน — projectOwner คือแหล่งความจริงเดียว
  // ของความสัมพันธ์ "ใครดูแลโปรเจกต์ไหน" หน้าทีมงาน derive จากตรงนี้ ไม่ใช่ member.projects
  const setMemberProjects = useCallback(
    (memberName: string, projectIds: string[]) => {
      if (!memberName) return
      const wanted = new Set(projectIds)
      const changed = projects.filter((p) => wanted.has(p.id) !== (p.projectOwner === memberName))
      if (changed.length === 0) return
      changed.forEach((p) => {
        const projectOwner = wanted.has(p.id) ? memberName : ''
        projectsApi
          .update(p.id, {
            projectName: p.projectName,
            customerId: p.customerId ?? '',
            projectOwner,
            projectStatus: p.projectStatus,
            solution: p.solution ?? '',
            connectNetwork: p.connectNetwork ?? '',
            documentUrl: p.documentUrl ?? '',
          })
          .catch(console.error)
      })
      mutateProjects((prev) =>
        prev.map((p) =>
          wanted.has(p.id) !== (p.projectOwner === memberName)
            ? { ...p, projectOwner: wanted.has(p.id) ? memberName : '' }
            : p,
        ),
      )
    },
    [projects, mutateProjects],
  )

  const addCustomer = useCallback(
    (data: CustomerInput) => {
      const id = uid('cust')
      customersApi.create(data).catch(console.error)
      setCustomers((prev) => [...prev, { ...data, id }])
      return id
    },
    [],
  )

  const updateCustomer = useCallback(
    (customerId: string, data: CustomerInput) => {
      customersApi.update(customerId, data).catch(console.error)
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...data, id: customerId } : c)))
    },
    [],
  )

  const deleteCustomer = useCallback(
    (customerId: string) => {
      customersApi.delete(customerId).catch(console.error)
      setCustomers((prev) => prev.filter((c) => c.id !== customerId))
      mutateProjects((prev) => prev.map((p) => (p.customerId === customerId ? { ...p, customerId: undefined } : p)))
    },
    [mutateProjects],
  )

  // ---------- Templates ----------

  const saveTemplate = useCallback(
    (name: string, description: string, phases: Phase[]) => {
      const tpl = {
        name: name.trim() || 'Template',
        description: description.trim(),
        phases: phases.map((ph) => ({
          name: ph.name,
          mainActivity: ph.mainActivity,
          tasks: ph.tasks.map((t) => t.description),
        })),
      }
      templatesApi.create(tpl).then(({ id }) => {
        setAllTemplates((prev) => [...prev, { ...tpl, id, phases: tpl.phases }])
      }).catch(console.error)
      // optimistic
      const tempId = uid('tpl')
      setAllTemplates((prev) => [...prev, { ...tpl, id: tempId }])
      return tempId
    },
    [],
  )

  const updateTemplate = useCallback(
    (templateId: string, name: string, description: string) => {
      const clean = { name: name.trim() || 'Template', description: description.trim() }
      templatesApi.update(templateId, clean).catch(console.error)
      setAllTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, ...clean } : t)))
    },
    [],
  )

  const deleteTemplate = useCallback(
    (templateId: string) => {
      templatesApi.delete(templateId).catch(console.error)
      setAllTemplates((prev) => prev.filter((t) => t.id !== templateId))
    },
    [],
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
      // Add each phase via API
      for (const ph of newPhases) {
        phasesApi.create(projectId, { name: ph.name, mainActivity: ph.mainActivity }).catch(console.error)
      }
      mutateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p
          const combined = mode === 'replace' ? newPhases : [...p.phases, ...newPhases]
          return { ...p, phases: combined.map((ph, i) => ({ ...ph, phaseNumber: i + 1 })) }
        }),
      )
    },
    [templates, mutateProjects],
  )

  const resetAll = useCallback(() => {
    reloadAll().catch(console.error)
  }, [reloadAll])

  // ---------- Value ----------

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      customers,
      loading,
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
      teamMembers,
      addTeamMember,
      updateTeamMember,
      deleteTeamMember,
      setMemberProjects,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      templates,
      saveTemplate,
      updateTemplate,
      deleteTemplate,
      applyTemplate,
      resetAll,
    }),
    [
      projects, customers, loading,
      toggleTask, addTask, updateTask, deleteTask,
      addPhase, updatePhase, deletePhase, movePhase, moveTask,
      addAsset, updateAsset, deleteAsset,
      importAssets, importServices,
      addService, updateService, deleteService,
      addProject, updateProject, deleteProject,
      teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, setMemberProjects,
      addCustomer, updateCustomer, deleteCustomer,
      templates, saveTemplate, updateTemplate, deleteTemplate, applyTemplate,
      resetAll,
    ],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used within a ProjectProvider')
  return ctx
}
