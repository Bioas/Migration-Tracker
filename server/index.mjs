import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env'), override: true })
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 8787
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[requirement-check] ⚠️  ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า — ตั้งใน server/.env ก่อนใช้งาน')
}

const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

const app = express()
app.use(cors()) // dev: allow all origins. Restrict in production.
app.use(express.json({ limit: '1mb' }))

// ---------- SQLite CRUD routes ----------
import routes from './routes.mjs'
app.use(routes)

const SYSTEM = `คุณเป็นผู้ช่วย Pre-sales / PM ของทีม Migrate & Implement VM ขึ้น NIPA Cloud
หน้าที่: ตรวจว่าข้อมูล "VMs" และ "Service (Add-on)" ที่บันทึกไว้ในระบบครบพอที่จะเริ่ม migration หรือยัง
แล้วสรุปสิ่งที่ยังขาด พร้อมร่างคำถามภาษาไทยที่สุภาพ กระชับ ส่งให้ลูกค้าได้ทันที

ประเมินเฉพาะจากข้อมูล VMs และ Service ที่ส่งมาเท่านั้น — อย่าถามเรื่องระดับโครงการ
(เช่น cutover window, RTO/RPO, VPN, backup, ผู้ประสานงาน) เพราะไม่อยู่ในขอบเขตการตรวจนี้

VM แต่ละเครื่องควรมี: Service, License, OS, vCPU, RAM, Storage Type, OS Disk, IP Private,
Subnet mask และ Network Policy (Port / Source / Destination อย่างน้อย 1 rule ที่ครบทั้งสามช่อง)

Service ควรมีตามประเภท:
- Load Balancer: Availability Zone, Topology, Algorithm, Protocol, Port, Spec, IP Private, Members
- Database: Availability Zone, Engine, Version, Plan, Storage (GB), Storage Type, IP Private
- Object Storage: Bucket, Storage Class, Quota (GB), Access

นอกจากช่องที่ว่าง ให้ดูความสมเหตุสมผลของข้อมูลด้วย เช่น spec ที่ดูผิดปกติ,
IP ที่ชนกันระหว่างเครื่อง, Members ของ LB ที่ไม่ตรงกับ IP ของ VM ที่มีอยู่

ตอบกลับผ่านเครื่องมือ report_requirement_check เท่านั้น`

const TOOL = {
  name: 'report_requirement_check',
  description: 'ส่งผลการตรวจสอบความครบถ้วนของข้อมูลและคำถามสำหรับลูกค้า',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100, description: 'เปอร์เซ็นต์ความครบถ้วนของข้อมูล' },
      summary: { type: 'string', description: 'สรุปภาพรวมสั้น ๆ ภาษาไทย' },
      missing: {
        type: 'array',
        description: 'รายการข้อมูลที่ยังขาดหรือกำกวม',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string', description: 'หัวข้อที่ขาด' },
            why: { type: 'string', description: 'ทำไมจึงจำเป็น' },
          },
          required: ['item', 'why'],
          additionalProperties: false,
        },
      },
      questions: {
        type: 'array',
        description: 'คำถามภาษาไทยพร้อมส่งลูกค้า',
        items: { type: 'string' },
      },
    },
    required: ['score', 'summary', 'missing', 'questions'],
    additionalProperties: false,
  },
}

function compactProject(project) {
  const assets = (project?.assets ?? []).map((a) => ({
    name: a.name,
    role: a.role,
    service: a.service,
    license: a.license,
    source: a.source,
    os: a.os,
    machineType: a.machineType,
    vcpu: a.vcpu,
    ramGB: a.ramGB,
    storageType: a.storageType,
    osDiskGB: a.osDiskGB,
    dataDiskGB: a.dataDiskGB,
    ipPrivate: a.ipAddress,
    subnetMask: a.subnetMask,
    ipPublic: a.ipPublic,
    domain: a.domain,
    ports: a.ports,
    networkPolicySource: a.allowedSource,
    networkPolicyRules: Array.isArray(a.policies) ? a.policies : undefined,
    destination: a.destination,
  }))
  const services = (project?.services ?? []).map((s) => ({
    name: s.name,
    type: s.type,
    availabilityZone: s.availabilityZone,
    topology: s.topology,
    algorithm: s.algorithm,
    protocol: s.protocol,
    port: s.port,
    spec: s.spec,
    members: s.members,
    engine: s.engine,
    version: s.version,
    plan: s.plan,
    capacityGB: s.capacityGB,
    storageType: s.storageType,
    bucket: s.bucket,
    storageClass: s.storageClass,
    access: s.access,
    ipPrivate: s.ipPrivate,
    ipPublic: s.ipPublic,
  }))
  return {
    projectName: project?.projectName,
    customer: project?.customer,
    owner: project?.projectOwner,
    status: project?.projectStatus,
    assets,
    services,
  }
}

app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL }))

app.post('/api/requirement-check', async (req, res) => {
  const { project } = req.body ?? {}
  if (!project) return res.status(400).json({ error: 'missing project' })

  const userContent = `ข้อมูล VMs และ Service ในระบบ (JSON):
${JSON.stringify(compactProject(project), null, 2)}

โปรดวิเคราะห์ความครบถ้วนของข้อมูล VMs และ Service แล้วเรียก report_requirement_check`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'report_requirement_check' },
      messages: [{ role: 'user', content: userContent }],
    })
    const block = response.content.find((b) => b.type === 'tool_use')
    if (!block) return res.status(502).json({ error: 'no structured output' })
    return res.json(block.input)
  } catch (e) {
    console.error('[requirement-check]', e?.status ?? '', e?.message ?? e)
    const status = e?.status === 401 ? 401 : 500
    return res.status(status).json({ error: e?.message ?? 'internal error' })
  }
})

// ---------- AI sheet classification (import จาก Excel) ----------

const CLASSIFY_SYSTEM = `คุณเป็นผู้ช่วยวิเคราะห์ไฟล์ Excel ของทีม Migrate & Implement VM ขึ้น NIPA Cloud
ผู้ใช้ upload workbook ที่มีหลาย sheet ระบบจำแนกอัตโนมัติไม่สำเร็จกับ sheet นี้ จึงส่งตัวอย่างข้อมูลมาให้คุณช่วย

หน้าที่ของคุณ:
1. ดูชื่อ sheet และตัวอย่างแถวข้อมูล แล้วตัดสินว่าเป็นตารางอะไร:
   - "vm" = รายการ VM/Server (inventory ของเครื่อง)
   - "service" = รายการบริการเสริม cloud (Load Balancer / Database / Object Storage)
   - "none" = ไม่ใช่ทั้งสองอย่าง (เช่น diagram, action plan, contact, หน้าปก)
2. ระบุว่าแถวไหนคือหัวตาราง (headerRowIndex — index เริ่มจาก 0 ตามตัวอย่างที่ให้)
3. map แต่ละคอลัมน์ (index เริ่มจาก 0) เข้า field ของระบบ — map เฉพาะคอลัมน์ที่มั่นใจ คอลัมน์ที่ไม่เกี่ยวให้ข้ามไป

field ที่ใช้ได้เมื่อ kind = "vm":
name (ชื่อเครื่อง/hostname — จำเป็นที่สุด), role (Web/App/Database/...), service, license, source (VMware/AWS/...),
os, machineType, vcpu, ramGB, storageType, osDiskGB, dataDiskGB, ipAddress (IP private), subnetMask,
ipPublic, domain, ports, allowedSource (network policy source), destination (network policy destination), method, status

field ที่ใช้ได้เมื่อ kind = "service":
name, type (Load Balancer/Database/Object Storage), availabilityZone, topology, algorithm, protocol, port,
spec, members, engine, version, plan, storageType, capacityGB (ขนาด storage GB), bucket, storageClass,
access, endpoint, ipPrivate, ipPublic, note

ตอบผ่านเครื่องมือ report_sheet_classification เท่านั้น`

const CLASSIFY_TOOL = {
  name: 'report_sheet_classification',
  description: 'รายงานผลการจำแนก sheet และการ map คอลัมน์',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['vm', 'service', 'none'], description: 'ประเภทข้อมูลใน sheet' },
      headerRowIndex: { type: 'integer', minimum: 0, description: 'index แถวหัวตาราง (0-based ตามตัวอย่างที่ได้รับ) — ใส่ 0 ถ้า kind เป็น none' },
      serviceTypeDefault: {
        type: 'string',
        enum: ['Load Balancer', 'Database', 'Object Storage', ''],
        description: 'เมื่อ kind=service และทั้ง sheet เป็นบริการประเภทเดียวโดยไม่มีคอลัมน์ type ให้ระบุประเภทนั้น มิฉะนั้นใส่ ""',
      },
      columns: {
        type: 'array',
        description: 'การ map คอลัมน์ → field (เฉพาะคอลัมน์ที่มั่นใจ) — ว่างได้ถ้า kind เป็น none',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer', minimum: 0, description: 'index คอลัมน์ (0-based)' },
            field: { type: 'string', description: 'ชื่อ field ของระบบตามรายการใน system prompt' },
          },
          required: ['index', 'field'],
          additionalProperties: false,
        },
      },
      note: { type: 'string', description: 'คำอธิบายสั้น ๆ ภาษาไทยว่าตัดสินจากอะไร' },
    },
    required: ['kind', 'headerRowIndex', 'serviceTypeDefault', 'columns', 'note'],
    additionalProperties: false,
  },
}

app.post('/api/classify-sheet', async (req, res) => {
  const { sheetName, rows } = req.body ?? {}
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'missing rows' })

  // จำกัดขนาดตัวอย่างกันโดน prompt ยาวเกิน
  const sample = rows
    .slice(0, 15)
    .map((r) => (Array.isArray(r) ? r.slice(0, 40).map((c) => String(c ?? '').slice(0, 80)) : []))

  const userContent = `ชื่อ sheet: "${String(sheetName ?? '').slice(0, 120)}"

ตัวอย่างแถวข้อมูล (array ของแถว แต่ละแถวคือ array ของ cell, index เริ่มจาก 0):
${JSON.stringify(sample, null, 1)}

โปรดจำแนกแล้วเรียก report_sheet_classification`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'disabled' },
      system: CLASSIFY_SYSTEM,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: 'tool', name: 'report_sheet_classification' },
      messages: [{ role: 'user', content: userContent }],
    })
    const block = response.content.find((b) => b.type === 'tool_use')
    if (!block) return res.status(502).json({ error: 'no structured output' })
    return res.json(block.input)
  } catch (e) {
    console.error('[classify-sheet]', e?.status ?? '', e?.message ?? e)
    const status = e?.status === 401 ? 401 : 500
    return res.status(status).json({ error: e?.message ?? 'internal error' })
  }
})


app.listen(PORT, () => {
  console.log(`[requirement-check] listening on http://localhost:${PORT}  (model: ${MODEL})`)
})
