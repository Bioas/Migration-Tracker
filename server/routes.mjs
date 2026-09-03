import { Router } from 'express'
import { getDb, save } from './db.mjs'

const router = Router()

// ---------- helpers ----------

function rows(result) {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
}

function row(result) {
  return rows(result)[0] ?? null
}

function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`
}

// ---------- Customers ----------

router.get('/api/customers', async (_req, res) => {
  const db = await getDb()
  const result = db.exec('SELECT * FROM customers ORDER BY name')
  res.json(rows(result))
})

router.post('/api/customers', async (req, res) => {
  const db = await getDb()
  const id = uid('cust')
  const { name = '', contactName = '', contactEmail = '', contactPhone = '', industry = '', note = '' } = req.body ?? {}
  db.run('INSERT INTO customers (id, name, contactName, contactEmail, contactPhone, industry, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, contactName, contactEmail, contactPhone, industry, note])
  save(db)
  res.json({ id })
})

router.put('/api/customers/:id', async (req, res) => {
  const db = await getDb()
  const { name, contactName, contactEmail, contactPhone, industry, note } = req.body ?? {}
  db.run('UPDATE customers SET name=?, contactName=?, contactEmail=?, contactPhone=?, industry=?, note=? WHERE id=?',
    [name ?? '', contactName ?? '', contactEmail ?? '', contactPhone ?? '', industry ?? '', note ?? '', req.params.id])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/customers/:id', async (req, res) => {
  const db = await getDb()
  db.run('DELETE FROM customers WHERE id=?', [req.params.id])
  // unlink projects
  db.run("UPDATE projects SET customerId='' WHERE customerId=?", [req.params.id])
  save(db)
  res.json({ ok: true })
})

// ---------- Team members ----------

/** projects เก็บเป็น JSON array ในคอลัมน์เดียว — แปลงกลับตอนอ่าน */
function parseMember(m) {
  let projects = []
  try { projects = JSON.parse(m.projects ?? '[]') } catch { projects = [] }
  return { id: m.id, name: m.name, role: m.role ?? '', projects: Array.isArray(projects) ? projects : [] }
}

router.get('/api/team', async (_req, res) => {
  const db = await getDb()
  res.json(rows(db.exec('SELECT * FROM team_members ORDER BY name')).map(parseMember))
})

router.post('/api/team', async (req, res) => {
  const db = await getDb()
  const id = uid('tm')
  const { name = '', role = '', projects = [] } = req.body ?? {}
  db.run('INSERT INTO team_members (id, name, role, projects) VALUES (?, ?, ?, ?)',
    [id, name, role, JSON.stringify(Array.isArray(projects) ? projects : [])])
  save(db)
  res.json({ id })
})

router.put('/api/team/:id', async (req, res) => {
  const db = await getDb()
  const { name, role, projects } = req.body ?? {}
  db.run('UPDATE team_members SET name=?, role=?, projects=? WHERE id=?',
    [name ?? '', role ?? '', JSON.stringify(Array.isArray(projects) ? projects : []), req.params.id])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/team/:id', async (req, res) => {
  const db = await getDb()
  db.run('DELETE FROM team_members WHERE id=?', [req.params.id])
  save(db)
  res.json({ ok: true })
})

// ---------- Projects ----------

router.get('/api/projects', async (_req, res) => {
  const db = await getDb()
  const projects = rows(db.exec('SELECT * FROM projects ORDER BY id'))
  for (const p of projects) {
    p.assets = rows(db.exec('SELECT * FROM assets WHERE projectId=?', [p.id]))
    p.services = rows(db.exec('SELECT * FROM services WHERE projectId=?', [p.id]))
    const phases = rows(db.exec('SELECT * FROM phases WHERE projectId=? ORDER BY phaseNumber', [p.id]))
    for (const ph of phases) {
      ph.tasks = rows(db.exec('SELECT * FROM tasks WHERE phaseId=?', [ph.id]))
      ph.status = ph.status === 1
    }
    p.phases = phases
    // parse asset policies + dataDisks JSON
    for (const a of p.assets) {
      try { a.policies = JSON.parse(a.policies || '[]') } catch { a.policies = [] }
      try { a.dataDisks = JSON.parse(a.dataDisks || '[]') } catch { a.dataDisks = [] }
    }
    // parse service booleans
    for (const s of p.services) {
      s.ha = s.ha === 1
    }
  }
  res.json(projects)
})

router.post('/api/projects', async (req, res) => {
  const db = await getDb()
  const id = uid('proj')
  const {
    projectName = '', customerId = '', projectOwner = '', projectStatus = 'Active',
    solution = '', connectNetwork = '', documentUrl = '',
  } = req.body ?? {}
  // resolve customer name
  const cust = row(db.exec('SELECT name FROM customers WHERE id=?', [customerId]))
  const customer = cust?.name ?? ''
  db.run(
    'INSERT INTO projects (id, projectName, customer, customerId, projectOwner, projectStatus, solution, connectNetwork, documentUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, projectName, customer, customerId, projectOwner, projectStatus, solution, connectNetwork, documentUrl])
  save(db)
  res.json({ id })
})

router.put('/api/projects/:id', async (req, res) => {
  const db = await getDb()
  const { projectName, customerId, projectOwner, projectStatus, solution, connectNetwork, documentUrl } = req.body ?? {}
  const cust = customerId ? row(db.exec('SELECT name FROM customers WHERE id=?', [customerId])) : null
  const customer = cust?.name ?? ''
  db.run(
    'UPDATE projects SET projectName=?, customer=?, customerId=?, projectOwner=?, projectStatus=?, solution=?, connectNetwork=?, documentUrl=? WHERE id=?',
    [projectName ?? '', customer, customerId ?? '', projectOwner ?? '', projectStatus ?? 'Active',
     solution ?? '', connectNetwork ?? '', documentUrl ?? '', req.params.id])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/projects/:id', async (req, res) => {
  const db = await getDb()
  // cascade delete related data
  const phaseIds = rows(db.exec('SELECT id FROM phases WHERE projectId=?', [req.params.id])).map((r) => r.id)
  for (const pid of phaseIds) {
    db.run('DELETE FROM tasks WHERE phaseId=?', [pid])
  }
  db.run('DELETE FROM phases WHERE projectId=?', [req.params.id])
  db.run('DELETE FROM assets WHERE projectId=?', [req.params.id])
  db.run('DELETE FROM services WHERE projectId=?', [req.params.id])
  db.run('DELETE FROM projects WHERE id=?', [req.params.id])
  save(db)
  res.json({ ok: true })
})

// ---------- Tasks ----------

router.post('/api/projects/:projectId/phases/:phaseId/tasks', async (req, res) => {
  const db = await getDb()
  const id = uid('task')
  const { description = '' } = req.body ?? {}
  db.run('INSERT INTO tasks (id, phaseId, description, completed) VALUES (?, ?, ?, 0)',
    [id, req.params.phaseId, description])
  save(db)
  res.json({ id })
})

router.put('/api/projects/:projectId/phases/:phaseId/tasks/:taskId', async (req, res) => {
  const db = await getDb()
  const { description, completed } = req.body ?? {}
  if (description !== undefined) {
    db.run('UPDATE tasks SET description=? WHERE id=?', [description, req.params.taskId])
  }
  if (completed !== undefined) {
    db.run('UPDATE tasks SET completed=? WHERE id=?', [completed ? 1 : 0, req.params.taskId])
  }
  save(db)
  res.json({ ok: true })
})

router.delete('/api/projects/:projectId/phases/:phaseId/tasks/:taskId', async (req, res) => {
  const db = await getDb()
  db.run('DELETE FROM tasks WHERE id=?', [req.params.taskId])
  save(db)
  res.json({ ok: true })
})

// ---------- Phases ----------

router.post('/api/projects/:projectId/phases', async (req, res) => {
  const db = await getDb()
  const id = uid('phase')
  const { name = '', mainActivity = '' } = req.body ?? {}
  const maxNum = row(db.exec('SELECT COALESCE(MAX(phaseNumber),0) as m FROM phases WHERE projectId=?', [req.params.projectId]))
  const phaseNumber = (maxNum?.m ?? 0) + 1
  db.run('INSERT INTO phases (id, projectId, phaseNumber, name, mainActivity, status) VALUES (?, ?, ?, ?, ?, 0)',
    [id, req.params.projectId, phaseNumber, name, mainActivity])
  save(db)
  res.json({ id, phaseNumber })
})

router.put('/api/projects/:projectId/phases/:phaseId', async (req, res) => {
  const db = await getDb()
  const { name, mainActivity } = req.body ?? {}
  if (name !== undefined) db.run('UPDATE phases SET name=? WHERE id=?', [name, req.params.phaseId])
  if (mainActivity !== undefined) db.run('UPDATE phases SET mainActivity=? WHERE id=?', [mainActivity, req.params.phaseId])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/projects/:projectId/phases/:phaseId', async (req, res) => {
  const db = await getDb()
  db.run('DELETE FROM tasks WHERE phaseId=?', [req.params.phaseId])
  db.run('DELETE FROM phases WHERE id=?', [req.params.phaseId])
  // renumber
  const remaining = rows(db.exec('SELECT id FROM phases WHERE projectId=? ORDER BY phaseNumber', [req.params.projectId]))
  for (let i = 0; i < remaining.length; i++) {
    db.run('UPDATE phases SET phaseNumber=? WHERE id=?', [i + 1, remaining[i].id])
  }
  save(db)
  res.json({ ok: true })
})

router.put('/api/projects/:projectId/phases/:phaseId/move', async (req, res) => {
  const db = await getDb()
  const { to } = req.body ?? {}
  if (typeof to !== 'number') return res.status(400).json({ error: 'missing to' })
  const phases = rows(db.exec('SELECT id FROM phases WHERE projectId=? ORDER BY phaseNumber', [req.params.projectId]))
  const fromIdx = phases.findIndex((p) => p.id === req.params.phaseId)
  if (fromIdx < 0) return res.status(404).json({ error: 'phase not found' })
  const [moved] = phases.splice(fromIdx, 1)
  phases.splice(Math.min(to, phases.length), 0, moved)
  for (let i = 0; i < phases.length; i++) {
    db.run('UPDATE phases SET phaseNumber=? WHERE id=?', [i + 1, phases[i].id])
  }
  save(db)
  res.json({ ok: true })
})

// ---------- Assets ----------

router.post('/api/projects/:projectId/assets', async (req, res) => {
  const db = await getDb()
  const id = uid('asset')
  const a = req.body ?? {}
  db.run(`INSERT INTO assets (id, projectId, name, role, service, license, source, os, machineType, vcpu, ramGB, storageType, osDiskGB, dataDiskGB, dataDisks, ipAddress, subnetMask, ipPublic, domain, ports, allowedSource, policies, method, status, destination, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.projectId, a.name ?? '', a.role ?? 'Other', a.service ?? '', a.license ?? '', a.source ?? 'Other',
     a.os ?? '', a.machineType ?? '', a.vcpu ?? 0, a.ramGB ?? 0, a.storageType ?? '', a.osDiskGB ?? 0, a.dataDiskGB ?? 0,
     JSON.stringify(a.dataDisks ?? []),
     a.ipAddress ?? '', a.subnetMask ?? '', a.ipPublic ?? '', a.domain ?? '', a.ports ?? '', a.allowedSource ?? '',
     JSON.stringify(a.policies ?? []), a.method ?? 'Hystax', a.status ?? 'Pending', a.destination ?? '', a.note ?? ''])
  save(db)
  res.json({ id })
})

router.put('/api/projects/:projectId/assets/:assetId', async (req, res) => {
  const db = await getDb()
  const a = req.body ?? {}
  db.run(`UPDATE assets SET name=?, role=?, service=?, license=?, source=?, os=?, machineType=?, vcpu=?, ramGB=?, storageType=?, osDiskGB=?, dataDiskGB=?, dataDisks=?, ipAddress=?, subnetMask=?, ipPublic=?, domain=?, ports=?, allowedSource=?, policies=?, method=?, status=?, destination=?, note=? WHERE id=?`,
    [a.name ?? '', a.role ?? 'Other', a.service ?? '', a.license ?? '', a.source ?? 'Other',
     a.os ?? '', a.machineType ?? '', a.vcpu ?? 0, a.ramGB ?? 0, a.storageType ?? '', a.osDiskGB ?? 0, a.dataDiskGB ?? 0,
     JSON.stringify(a.dataDisks ?? []),
     a.ipAddress ?? '', a.subnetMask ?? '', a.ipPublic ?? '', a.domain ?? '', a.ports ?? '', a.allowedSource ?? '',
     JSON.stringify(a.policies ?? []), a.method ?? 'Hystax', a.status ?? 'Pending', a.destination ?? '', a.note ?? '',
     req.params.assetId])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/projects/:projectId/assets/:assetId', async (req, res) => {
  const db = await getDb()
  db.run('DELETE FROM assets WHERE id=?', [req.params.assetId])
  save(db)
  res.json({ ok: true })
})

// ---------- Services ----------

router.post('/api/projects/:projectId/services', async (req, res) => {
  const db = await getDb()
  const id = uid('svc')
  const s = req.body ?? {}
  db.run(`INSERT INTO services (id, projectId, type, name, algorithm, protocol, port, members, engine, version, plan, ha, bucket, storageClass, access, capacityGB, endpoint, ipPublic, ipPrivate, availabilityZone, topology, spec, storageType, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.projectId, s.type ?? 'Load Balancer', s.name ?? '', s.algorithm ?? '', s.protocol ?? '', s.port ?? '',
     s.members ?? '', s.engine ?? '', s.version ?? '', s.plan ?? '', s.ha ? 1 : 0, s.bucket ?? '', s.storageClass ?? '',
     s.access ?? '', s.capacityGB ?? 0, s.endpoint ?? '', s.ipPublic ?? '', s.ipPrivate ?? '', s.availabilityZone ?? '',
     s.topology ?? '', s.spec ?? '', s.storageType ?? '', s.note ?? ''])
  save(db)
  res.json({ id })
})

router.put('/api/projects/:projectId/services/:serviceId', async (req, res) => {
  const db = await getDb()
  const s = req.body ?? {}
  db.run(`UPDATE services SET type=?, name=?, algorithm=?, protocol=?, port=?, members=?, engine=?, version=?, plan=?, ha=?, bucket=?, storageClass=?, access=?, capacityGB=?, endpoint=?, ipPublic=?, ipPrivate=?, availabilityZone=?, topology=?, spec=?, storageType=?, note=? WHERE id=?`,
    [s.type ?? 'Load Balancer', s.name ?? '', s.algorithm ?? '', s.protocol ?? '', s.port ?? '',
     s.members ?? '', s.engine ?? '', s.version ?? '', s.plan ?? '', s.ha ? 1 : 0, s.bucket ?? '', s.storageClass ?? '',
     s.access ?? '', s.capacityGB ?? 0, s.endpoint ?? '', s.ipPublic ?? '', s.ipPrivate ?? '', s.availabilityZone ?? '',
     s.topology ?? '', s.spec ?? '', s.storageType ?? '', s.note ?? '', req.params.serviceId])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/projects/:projectId/services/:serviceId', async (req, res) => {
  const db = await getDb()
  db.run('DELETE FROM services WHERE id=?', [req.params.serviceId])
  save(db)
  res.json({ ok: true })
})

// ---------- Bulk import (assets / services) ----------

router.post('/api/projects/:projectId/import-assets', async (req, res) => {
  const db = await getDb()
  const { assets = [], mode = 'append' } = req.body ?? {}
  if (mode === 'replace') {
    db.run('DELETE FROM assets WHERE projectId=?', [req.params.projectId])
  }
  const stmt = db.prepare(`INSERT INTO assets (id, projectId, name, role, service, license, source, os, machineType, vcpu, ramGB, storageType, osDiskGB, dataDiskGB, dataDisks, ipAddress, subnetMask, ipPublic, domain, ports, allowedSource, policies, method, status, destination, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  for (const a of assets) {
    const id = uid('asset')
    stmt.run([id, req.params.projectId, a.name ?? '', a.role ?? 'Other', a.service ?? '', a.license ?? '', a.source ?? 'Other',
      a.os ?? '', a.machineType ?? '', a.vcpu ?? 0, a.ramGB ?? 0, a.storageType ?? '', a.osDiskGB ?? 0, a.dataDiskGB ?? 0,
      JSON.stringify(a.dataDisks ?? []),
      a.ipAddress ?? '', a.subnetMask ?? '', a.ipPublic ?? '', a.domain ?? '', a.ports ?? '', a.allowedSource ?? '',
      JSON.stringify(a.policies ?? []), a.method ?? 'Hystax', a.status ?? 'Pending', a.destination ?? '', a.note ?? ''])
  }
  stmt.free()
  save(db)
  res.json({ ok: true, count: assets.length })
})

router.post('/api/projects/:projectId/import-services', async (req, res) => {
  const db = await getDb()
  const { services = [], mode = 'append' } = req.body ?? {}
  if (mode === 'replace') {
    db.run('DELETE FROM services WHERE projectId=?', [req.params.projectId])
  }
  const stmt = db.prepare(`INSERT INTO services (id, projectId, type, name, algorithm, protocol, port, members, engine, version, plan, ha, bucket, storageClass, access, capacityGB, endpoint, ipPublic, ipPrivate, availabilityZone, topology, spec, storageType, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  for (const s of services) {
    const id = uid('svc')
    stmt.run([id, req.params.projectId, s.type ?? 'Load Balancer', s.name ?? '', s.algorithm ?? '', s.protocol ?? '', s.port ?? '',
      s.members ?? '', s.engine ?? '', s.version ?? '', s.plan ?? '', s.ha ? 1 : 0, s.bucket ?? '', s.storageClass ?? '',
      s.access ?? '', s.capacityGB ?? 0, s.endpoint ?? '', s.ipPublic ?? '', s.ipPrivate ?? '', s.availabilityZone ?? '',
      s.topology ?? '', s.spec ?? '', s.storageType ?? '', s.note ?? ''])
  }
  stmt.free()
  save(db)
  res.json({ ok: true, count: services.length })
})

// ---------- Templates ----------

router.get('/api/templates', async (_req, res) => {
  const db = await getDb()
  const templates = rows(db.exec('SELECT * FROM templates ORDER BY builtIn DESC, name'))
  for (const t of templates) {
    t.builtIn = t.builtIn === 1
    const phases = rows(db.exec('SELECT * FROM template_phases WHERE templateId=? ORDER BY phaseIndex', [t.id]))
    for (const ph of phases) {
      ph.tasks = rows(db.exec('SELECT description FROM template_tasks WHERE templatePhaseId=? ORDER BY rowid', [ph.id]))
      ph.tasks = ph.tasks.map((r) => r.description)
    }
    t.phases = phases.map((ph) => ({ name: ph.name, mainActivity: ph.mainActivity, tasks: ph.tasks }))
  }
  res.json(templates)
})

router.post('/api/templates', async (req, res) => {
  const db = await getDb()
  const id = uid('tpl')
  const { name = '', description = '', phases = [] } = req.body ?? {}
  db.run('INSERT INTO templates (id, name, description, builtIn) VALUES (?, ?, ?, 0)', [id, name, description])
  const phStmt = db.prepare('INSERT INTO template_phases (id, templateId, phaseIndex, name, mainActivity) VALUES (?, ?, ?, ?, ?)')
  const taskStmt = db.prepare('INSERT INTO template_tasks (id, templatePhaseId, description) VALUES (?, ?, ?)')
  for (let i = 0; i < phases.length; i++) {
    const ph = phases[i]
    const phId = `tpl-ph-${id}-${i}`
    phStmt.run([phId, id, i, ph.name ?? '', ph.mainActivity ?? ''])
    for (let j = 0; j < (ph.tasks ?? []).length; j++) {
      taskStmt.run([`tpl-task-${id}-${i}-${j}`, phId, ph.tasks[j]])
    }
  }
  phStmt.free()
  taskStmt.free()
  save(db)
  res.json({ id })
})

router.put('/api/templates/:id', async (req, res) => {
  const db = await getDb()
  const t = row(db.exec('SELECT id FROM templates WHERE id=?', [req.params.id]))
  if (!t) return res.status(404).json({ error: 'not found' })
  const { name = '', description = '' } = req.body ?? {}
  db.run('UPDATE templates SET name=?, description=? WHERE id=?', [name, description, req.params.id])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/templates/:id', async (req, res) => {
  const db = await getDb()
  const t = row(db.exec('SELECT builtIn FROM templates WHERE id=?', [req.params.id]))
  if (!t) return res.status(404).json({ error: 'not found' })
  const phIds = rows(db.exec('SELECT id FROM template_phases WHERE templateId=?', [req.params.id])).map((r) => r.id)
  for (const pid of phIds) {
    db.run('DELETE FROM template_tasks WHERE templatePhaseId=?', [pid])
  }
  db.run('DELETE FROM template_phases WHERE templateId=?', [req.params.id])
  db.run('DELETE FROM templates WHERE id=?', [req.params.id])
  save(db)
  res.json({ ok: true })
})

// ---------- Health ----------

router.get('/api/db/health', async (_req, res) => {
  const db = await getDb()
  const count = row(db.exec('SELECT COUNT(*) as c FROM projects'))
  res.json({ ok: true, projects: count?.c ?? 0 })
})

export default router
