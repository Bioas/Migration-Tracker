import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'data.sqlite')

let db = null

export async function getDb() {
  if (db) return db

  const SQL = await initSqlJs()

  if (existsSync(DB_PATH)) {
    const buf = readFileSync(DB_PATH)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  // WAL-like: save after every write
  db.run('PRAGMA journal_mode = DELETE')

  initSchema(db)
  seedIfEmpty(db)
  save(db)

  return db
}

function initSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      contactName TEXT DEFAULT '',
      contactEmail TEXT DEFAULT '',
      contactPhone TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      note TEXT DEFAULT ''
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      role TEXT DEFAULT '',
      projects TEXT DEFAULT '[]'
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      projectName TEXT NOT NULL DEFAULT '',
      customer TEXT DEFAULT '',
      customerId TEXT DEFAULT '',
      projectOwner TEXT DEFAULT '',
      projectStatus TEXT DEFAULT 'Active',
      solution TEXT DEFAULT '',
      connectNetwork TEXT DEFAULT '',
      plannedStart TEXT DEFAULT '',
      plannedEnd TEXT DEFAULT '',
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT DEFAULT '',
      role TEXT DEFAULT 'Other',
      service TEXT DEFAULT '',
      license TEXT DEFAULT '',
      source TEXT DEFAULT 'Other',
      os TEXT DEFAULT '',
      machineType TEXT DEFAULT '',
      vcpu INTEGER DEFAULT 0,
      ramGB INTEGER DEFAULT 0,
      storageType TEXT DEFAULT '',
      osDiskGB INTEGER DEFAULT 0,
      dataDiskGB INTEGER DEFAULT 0,
      ipAddress TEXT DEFAULT '',
      subnetMask TEXT DEFAULT '',
      ipPublic TEXT DEFAULT '',
      domain TEXT DEFAULT '',
      ports TEXT DEFAULT '',
      allowedSource TEXT DEFAULT '',
      policies TEXT DEFAULT '[]',
      method TEXT DEFAULT 'Hystax',
      status TEXT DEFAULT 'Pending',
      destination TEXT DEFAULT '',
      note TEXT DEFAULT '',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      type TEXT DEFAULT 'Load Balancer',
      name TEXT DEFAULT '',
      algorithm TEXT DEFAULT '',
      protocol TEXT DEFAULT '',
      port TEXT DEFAULT '',
      members TEXT DEFAULT '',
      engine TEXT DEFAULT '',
      version TEXT DEFAULT '',
      plan TEXT DEFAULT '',
      ha INTEGER DEFAULT 0,
      bucket TEXT DEFAULT '',
      storageClass TEXT DEFAULT '',
      access TEXT DEFAULT '',
      capacityGB INTEGER DEFAULT 0,
      endpoint TEXT DEFAULT '',
      ipPublic TEXT DEFAULT '',
      ipPrivate TEXT DEFAULT '',
      availabilityZone TEXT DEFAULT '',
      topology TEXT DEFAULT '',
      spec TEXT DEFAULT '',
      storageType TEXT DEFAULT '',
      note TEXT DEFAULT '',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      phaseNumber INTEGER DEFAULT 0,
      name TEXT DEFAULT '',
      mainActivity TEXT DEFAULT '',
      status INTEGER DEFAULT 0,
      plannedStart TEXT DEFAULT '',
      plannedEnd TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      phaseId TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (phaseId) REFERENCES phases(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      builtIn INTEGER DEFAULT 0
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS template_phases (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL,
      phaseIndex INTEGER DEFAULT 0,
      name TEXT DEFAULT '',
      mainActivity TEXT DEFAULT '',
      FOREIGN KEY (templateId) REFERENCES templates(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS template_tasks (
      id TEXT PRIMARY KEY,
      templatePhaseId TEXT NOT NULL,
      description TEXT DEFAULT '',
      FOREIGN KEY (templatePhaseId) REFERENCES template_phases(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT DEFAULT '',
      role TEXT DEFAULT 'member',
      passwordHash TEXT NOT NULL,
      mustChangePassword INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT '',
      lastLoginAt TEXT DEFAULT ''
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      tokenHash TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT '',
      expiresAt TEXT DEFAULT '',
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // CREATE TABLE IF NOT EXISTS ไม่แตะตารางที่มีอยู่แล้ว — คอลัมน์ที่เพิ่มทีหลัง
  // ต้อง ALTER ให้ DB เก่าเอง ไม่งั้นค่าจะหายเงียบ ๆ ตอนบันทึก
  addColumnIfMissing(db, 'projects', 'solution', "TEXT DEFAULT ''")
  addColumnIfMissing(db, 'projects', 'connectNetwork', "TEXT DEFAULT ''")
}

function addColumnIfMissing(db, table, column, decl) {
  const cols = db.exec(`PRAGMA table_info(${table})`)[0]?.values.map((v) => v[1]) ?? []
  if (cols.includes(column)) return
  db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`)
}

/** ทีมงานตั้งต้น — ใส่ให้ตอนตาราง team_members ยังว่าง หลังจากนั้นแก้ผ่านหน้าเว็บ */
const SEED_TEAM = [
  { id: 'pm1', name: 'PM ผู้ดูแล', role: 'Project Manager', projects: ['1', '2'] },
  { id: 'eng1', name: 'วิศวกร 1', role: 'Migration Engineer', projects: ['1'] },
  { id: 'eng2', name: 'วิศวกร 2', role: 'Cloud Implementer', projects: ['2'] },
]

/** แยกจาก seedIfEmpty เพราะ DB ที่สร้างก่อนมีตารางนี้จะมีลูกค้าอยู่แล้วและถูกข้ามไป */
function seedTeamIfEmpty(db) {
  const count = db.exec('SELECT COUNT(*) as c FROM team_members')[0]?.values[0][0] ?? 0
  if (count > 0) return false

  const teamStmt = db.prepare('INSERT INTO team_members (id, name, role, projects) VALUES (?, ?, ?, ?)')
  for (const m of SEED_TEAM) {
    teamStmt.run([m.id, m.name, m.role ?? '', JSON.stringify(m.projects ?? [])])
  }
  teamStmt.free()
  return true
}

function seedIfEmpty(db) {
  seedTeamIfEmpty(db)
  const count = db.exec('SELECT COUNT(*) as c FROM customers')[0]?.values[0][0] ?? 0
  if (count > 0) return // already seeded

  // Import seed data from mockData
  const { customers, projects } = await_import_seed()

  // Seed customers
  const custStmt = db.prepare(
    'INSERT INTO customers (id, name, contactName, contactEmail, contactPhone, industry, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  for (const c of customers) {
    custStmt.run([c.id, c.name, c.contactName ?? '', c.contactEmail ?? '', c.contactPhone ?? '', c.industry ?? '', c.note ?? ''])
  }
  custStmt.free()

  // Seed projects
  const projStmt = db.prepare(
    'INSERT INTO projects (id, projectName, customer, customerId, projectOwner, projectStatus) VALUES (?, ?, ?, ?, ?, ?)'
  )
  for (const p of projects) {
    projStmt.run([p.id, p.projectName, p.customer, p.customerId ?? '', p.projectOwner, p.projectStatus])
  }
  projStmt.free()

  // Seed assets, services, phases, tasks
  for (const p of projects) {
    const assetStmt = db.prepare(
      'INSERT INTO assets (id, projectId, name, role, service, license, source, os, machineType, vcpu, ramGB, storageType, osDiskGB, dataDiskGB, ipAddress, subnetMask, ipPublic, domain, ports, allowedSource, policies, method, status, destination, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const a of p.assets ?? []) {
      assetStmt.run([
        a.id, p.id, a.name, a.role, a.service, a.license, a.source, a.os, a.machineType,
        a.vcpu, a.ramGB, a.storageType, a.osDiskGB, a.dataDiskGB, a.ipAddress, a.subnetMask,
        a.ipPublic, a.domain, a.ports, a.allowedSource, JSON.stringify(a.policies ?? []),
        a.method, a.status, a.destination ?? '', a.note ?? '',
      ])
    }
    assetStmt.free()

    const svcStmt = db.prepare(
      'INSERT INTO services (id, projectId, type, name, algorithm, protocol, port, members, engine, version, plan, ha, bucket, storageClass, access, capacityGB, endpoint, ipPublic, ipPrivate, availabilityZone, topology, spec, storageType, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const s of p.services ?? []) {
      svcStmt.run([
        s.id, p.id, s.type, s.name, s.algorithm ?? '', s.protocol ?? '', s.port ?? '',
        s.members ?? '', s.engine ?? '', s.version ?? '', s.plan ?? '', s.ha ? 1 : 0,
        s.bucket ?? '', s.storageClass ?? '', s.access ?? '', s.capacityGB ?? 0,
        s.endpoint ?? '', s.ipPublic ?? '', s.ipPrivate ?? '', s.availabilityZone ?? '',
        s.topology ?? '', s.spec ?? '', s.storageType ?? '', s.note ?? '',
      ])
    }
    svcStmt.free()

    const phaseStmt = db.prepare(
      'INSERT INTO phases (id, projectId, phaseNumber, name, mainActivity, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const ph of p.phases) {
      phaseStmt.run([ph.id, p.id, ph.phaseNumber, ph.name, ph.mainActivity, ph.status ? 1 : 0])
    }
    phaseStmt.free()

    const taskStmt = db.prepare(
      'INSERT INTO tasks (id, phaseId, description, completed) VALUES (?, ?, ?, ?)'
    )
    for (const ph of p.phases) {
      for (const t of ph.tasks) {
        taskStmt.run([t.id, ph.id, t.description, t.completed ? 1 : 0])
      }
    }
    taskStmt.free()
  }

  // Seed built-in template from first project's phases
  const firstPhases = projects[0]?.phases ?? []
  if (firstPhases.length > 0) {
    const tplId = 'builtin-migration-runbook'
    db.run('INSERT INTO templates (id, name, description, builtIn) VALUES (?, ?, ?, 1)', [
      tplId, 'Migration Runbook มาตรฐาน', 'แผนงาน Migrate & Implement VM Cloud Server 6 ขั้นตอน',
    ])
    const tplPhStmt = db.prepare(
      'INSERT INTO template_phases (id, templateId, phaseIndex, name, mainActivity) VALUES (?, ?, ?, ?, ?)'
    )
    const tplTaskStmt = db.prepare(
      'INSERT INTO template_tasks (id, templatePhaseId, description) VALUES (?, ?, ?)'
    )
    for (let i = 0; i < firstPhases.length; i++) {
      const ph = firstPhases[i]
      const phId = `tpl-ph-${tplId}-${i}`
      tplPhStmt.run([phId, tplId, i, ph.name, ph.mainActivity])
      for (const t of ph.tasks) {
        tplTaskStmt.run([`tpl-task-${tplId}-${i}-${t.id}`, phId, t.description])
      }
    }
    tplPhStmt.free()
    tplTaskStmt.free()
  }
}

function await_import_seed() {
  // Seed data is static — synchronous import resolved at module load time.
  // We use a workaround: the seed data is embedded here to avoid async import issues.
  // In practice this is fine because mockData.ts is a small static file.
  try {
    // Dynamic import would be async; instead we inline a minimal version
    // that references the same seed data structure.
    // This is safe because db.mjs is only loaded in the server (Node.js ESM).
    throw new Error('use inline')
  } catch {
    return getInlineSeedData()
  }
}

/** Inline copy of seed data to avoid async import complications. */
function getInlineSeedData() {
  const customers = [
    {
      id: 'cust-acme-finance',
      name: 'Acme Finance Corp',
      contactName: 'John Shepherd',
      contactEmail: 'contact@acme-finance.example',
      contactPhone: '02-555-0100',
      industry: 'Finance',
      note: 'Acme Finance cloud migration project',
    },
    {
      id: 'cust-zeta-mfg',
      name: 'Zeta Manufacturing Ltd',
      contactName: 'Sarah Chen',
      contactEmail: 'ops@zeta-mfg.example',
      contactPhone: '02-555-0200',
      industry: 'Manufacturing',
      note: '[ZT-1042] Zeta Manufacturing Ltd',
    },
  ]

  const projects = [
    {
      id: '1',
      projectName: 'Phase 2 Handover & Cutover',
      customer: 'Acme Finance Corp',
      customerId: 'cust-acme-finance',
      projectOwner: 'PM ผู้ดูแล',
      projectStatus: 'Active',
      assets: [
        { id: 'as-1-1', name: 'web-prod-01', destination: '0.0.0.0/0', role: 'Web', service: 'Web Portal (IIS)', license: 'Windows Server 2019 (BYOL)', source: 'VMware', os: 'Windows Server 2019', machineType: '4vCPU/16GB', vcpu: 4, ramGB: 16, storageType: 'SSD', osDiskGB: 120, dataDiskGB: 0, ipAddress: '10.10.1.11', subnetMask: '255.255.255.0', ipPublic: '203.0.113.11', domain: 'portal.acme-finance.example', ports: '80,443', allowedSource: '0.0.0.0/0 (CDN)', policies: [{ port: '80', source: '0.0.0.0/0 (CDN)', destination: '10.10.1.11/32' }, { port: '443', source: '0.0.0.0/0 (CDN)', destination: '10.10.1.11/32' }, { port: '8080', source: '10.10.1.0/24', destination: '10.10.1.31/32' }, { port: '3389', source: '10.99.0.0/24 (VPN)', destination: '10.10.1.11/32' }], method: 'Hystax', status: 'Migrated' },
        { id: 'as-1-2', name: 'db-prod-01', destination: '10.10.1.0/24', role: 'Database', service: 'MySQL 8', license: '-', source: 'VMware', os: 'Ubuntu 20.04', machineType: '8vCPU/32GB', vcpu: 8, ramGB: 32, storageType: 'SSD', osDiskGB: 100, dataDiskGB: 400, ipAddress: '10.10.1.21', subnetMask: '255.255.255.0', ipPublic: '', domain: '', ports: '3306', allowedSource: '10.10.1.11/32', method: 'Hystax', status: 'Replicating', policies: [] },
        { id: 'as-1-3', name: 'app-prod-01', destination: '10.10.1.0/24', role: 'App', service: 'API Service', license: '-', source: 'VMware', os: 'Windows Server 2022', machineType: '4vCPU/16GB', vcpu: 4, ramGB: 16, storageType: 'SSD', osDiskGB: 120, dataDiskGB: 80, ipAddress: '10.10.1.31', subnetMask: '255.255.255.0', ipPublic: '', domain: '', ports: '8080', allowedSource: '10.10.1.0/24', method: 'Rebuild', status: 'Pending', policies: [] },
      ],
      services: [
        { id: 'sv-1-1', type: 'Load Balancer', name: 'lb-web', availabilityZone: 'Zone-A (Central)', topology: 'HA', spec: '2vCPU/4GB', ipPrivate: '10.10.1.5', algorithm: 'Round Robin', protocol: 'HTTPS', port: '443', members: '10.10.1.11, 10.10.1.12', ipPublic: '203.0.113.11', endpoint: 'lb-web.acme.nipa' },
        { id: 'sv-1-2', type: 'Database', name: 'db-mysql-prod', availabilityZone: 'Zone-A (Central)', engine: 'MySQL', version: '8.0', plan: '4vCPU/16GB', capacityGB: 200, ha: true, storageType: 'SSD', ipPrivate: '10.10.1.6', ipPublic: '', endpoint: 'db-mysql-prod.acme.nipa' },
        { id: 'sv-1-3', type: 'Object Storage', name: 'backup-store', bucket: 'acme-backup', storageClass: 'Standard', capacityGB: 2000, access: 'Private', endpoint: 'https://s3.nipa.cloud/acme-backup' },
      ],
      phases: [
        { id: '1-1', phaseNumber: 1, name: 'Preparation & Planning', mainActivity: 'Internal Kickoff', status: true, tasks: [{ id: '1-1-1', description: 'เก็บ Requirement ว่าแผนการ Migration ต้องทำ Migration Runbook', completed: true }] },
        { id: '1-2', phaseNumber: 2, name: 'Internal Preparation', mainActivity: 'External Kickoff / Hystax Internal Implement', status: true, tasks: [{ id: '1-2-1', description: 'รีบ Requirement ครบทั้ง Hystax Controller', completed: true }] },
        { id: '1-3', phaseNumber: 3, name: 'Customer Implementation', mainActivity: 'Hystax External Implement หรือ Create VM', status: true, tasks: [{ id: '1-3-1', description: 'ติดตั้ง Hystax Agent', completed: true }, { id: '1-3-2', description: 'ดำเนินการ Replication', completed: true }, { id: '1-3-3', description: 'ตรวจสอบ Status Sync ข้อมูล', completed: true }, { id: '1-3-4', description: 'ทำ Migrate Plan บน Hystax', completed: false }] },
        { id: '1-4', phaseNumber: 4, name: 'Testing & Validation', mainActivity: 'Testing', status: true, tasks: [{ id: '1-4-1', description: 'ตรวจสอบการใช้งาน', completed: true }, { id: '1-4-2', description: 'จัดทำเอกสารการใช้งาน', completed: true }] },
        { id: '1-5', phaseNumber: 5, name: 'Go-Live Execution', mainActivity: 'Cutover', status: false, tasks: [{ id: '1-5-1', description: 'ส่งมอบให้ลูกค้า', completed: false }] },
        { id: '1-6', phaseNumber: 6, name: 'Operations Handover', mainActivity: 'Handover', status: false, tasks: [{ id: '1-6-1', description: 'ส่งมอบเอกสารและ Diagram', completed: false }, { id: '1-6-2', description: 'แจ้ง Access และ VPN', completed: false }, { id: '1-6-3', description: 'ตัว อ. ให้ทีมต่อดำเนิน', completed: false }] },
      ],
    },
    {
      id: '2',
      projectName: 'Zeta Cloud Migration',
      customer: 'Zeta Manufacturing Ltd',
      customerId: 'cust-zeta-mfg',
      projectOwner: 'PM ผู้ดูแล',
      projectStatus: 'Active',
      assets: [
        { id: 'as-2-1', name: 'web-prod-01', destination: '0.0.0.0/0', role: 'Web', service: 'Web App (Nginx)', license: 'Ubuntu', source: 'Hyper-V', os: 'Ubuntu 22.04', machineType: '4vCPU/8GB', vcpu: 4, ramGB: 8, storageType: 'SSD', osDiskGB: 60, dataDiskGB: 40, ipAddress: '10.20.1.10', subnetMask: '255.255.255.0', ipPublic: '203.0.113.20', domain: 'app.zeta-mfg.example', ports: '80,443', allowedSource: '0.0.0.0/0', method: 'Hystax', status: 'Testing', policies: [] },
        { id: 'as-2-2', name: 'db-prod-01', destination: '10.20.1.0/24', role: 'Database', service: 'PostgreSQL 14', license: 'Ubuntu', source: 'Hyper-V', os: 'Ubuntu 22.04', machineType: '8vCPU/64GB', vcpu: 8, ramGB: 64, storageType: 'SSD', osDiskGB: 100, dataDiskGB: 900, ipAddress: '10.20.1.20', subnetMask: '255.255.255.0', ipPublic: '', domain: '', ports: '5432', allowedSource: '10.20.1.10/32', method: 'Hystax', status: 'Pending', policies: [] },
      ],
      services: [
        { id: 'sv-2-1', type: 'Load Balancer', name: 'lb-web', availabilityZone: 'Zone-B (Regional)', topology: 'Standalone', spec: '2vCPU/4GB', ipPrivate: '10.20.1.5', algorithm: 'Least Connections', protocol: 'HTTPS', port: '443', members: '10.20.1.10', ipPublic: '203.0.113.20', endpoint: 'lb-web.zeta.nipa' },
        { id: 'sv-2-2', type: 'Database', name: 'db-pg-prod', availabilityZone: 'Zone-B (Regional)', engine: 'PostgreSQL', version: '14', plan: '8vCPU/64GB', capacityGB: 500, ha: true, storageType: 'SSD', ipPrivate: '10.20.1.6', ipPublic: '', endpoint: 'db-pg-prod.zeta.nipa' },
        { id: 'sv-2-3', type: 'Object Storage', name: 'app-data', bucket: 'zeta-data', storageClass: 'Standard', capacityGB: 1000, access: 'Public', endpoint: 'https://s3.nipa.cloud/zeta-data' },
      ],
      phases: [
        { id: '2-1', phaseNumber: 1, name: 'Preparation & Planning', mainActivity: 'Internal Kickoff', status: true, tasks: [{ id: '2-1-1', description: 'เก็บ Requirement ว่าแผนการ Migration ต้องทำ Migration Runbook', completed: true }] },
        { id: '2-2', phaseNumber: 2, name: 'Internal Preparation', mainActivity: 'External Kickoff / Hystax Internal Implement', status: true, tasks: [{ id: '2-2-1', description: 'รีบ Requirement ครบทั้ง Hystax Controller', completed: true }] },
        { id: '2-3', phaseNumber: 3, name: 'Customer Implementation', mainActivity: 'Hystax External Implement หรือ Create VM', status: true, tasks: [{ id: '2-3-1', description: 'ติดตั้ง Hystax Agent', completed: true }, { id: '2-3-2', description: 'ดำเนินการ Replication', completed: true }, { id: '2-3-3', description: 'ตรวจสอบ Status Sync ข้อมูล', completed: true }, { id: '2-3-4', description: 'ทำ Migrate Plan บน Hystax', completed: false }] },
        { id: '2-4', phaseNumber: 4, name: 'Testing & Validation', mainActivity: 'Testing', status: true, tasks: [{ id: '2-4-1', description: 'ตรวจสอบการใช้งาน', completed: true }, { id: '2-4-2', description: 'จัดทำเอกสารการใช้งาน', completed: true }] },
        { id: '2-5', phaseNumber: 5, name: 'Go-Live Execution', mainActivity: 'Cutover', status: false, tasks: [{ id: '2-5-1', description: 'ส่งมอบให้ลูกค้า', completed: false }] },
        { id: '2-6', phaseNumber: 6, name: 'Operations Handover', mainActivity: 'Handover', status: false, tasks: [{ id: '2-6-1', description: 'ส่งมอบเอกสารและ Diagram', completed: false }, { id: '2-6-2', description: 'แจ้ง Access และ VPN', completed: false }, { id: '2-6-3', description: 'ตัว อ. ให้ทีมต่อดำเนิน', completed: false }] },
      ],
    },
  ]

  return { customers, projects }
}

export function save(database) {
  if (!database) return
  const data = database.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}
