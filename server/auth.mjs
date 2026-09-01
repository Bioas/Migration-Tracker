import { Router } from 'express'
import crypto from 'crypto'
import { promisify } from 'util'
import { getDb, save } from './db.mjs'

const scrypt = promisify(crypto.scrypt)

const COOKIE_NAME = 'mt_session'
/** อายุ session — ต้องล็อกอินใหม่หลังจากนี้ */
const SESSION_DAYS = 7
/** ล็อกชั่วคราวเมื่อกรอกรหัสผิดติดกันหลายครั้ง */
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000

export const router = Router()

// ---------- helpers ----------

function rows(result) {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map((r) => {
    const obj = {}
    columns.forEach((c, i) => { obj[c] = r[i] })
    return obj
  })
}

const one = (result) => rows(result)[0] ?? null

function readCookie(req, name) {
  const raw = req.headers.cookie
  if (!raw) return null
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

/** เก็บเฉพาะ hash ของ token ใน DB — ถ้าไฟล์ DB หลุด token ที่ยังไม่หมดอายุก็ใช้ไม่ได้ */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(keyHex, 'hex')
  // ความยาวต่างกัน timingSafeEqual จะ throw
  return key.length === expected.length && crypto.timingSafeEqual(key, expected)
}

const publicUser = (u) =>
  u && { id: u.id, username: u.username, name: u.name ?? '', role: u.role ?? 'member', mustChangePassword: u.mustChangePassword === 1 }

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ]
  // ต้องเปิดเมื่ออยู่หลัง HTTPS — ถ้าเปิดตอน dev บน http เบราว์เซอร์จะไม่ส่ง cookie กลับมาเลย
  if (process.env.SECURE_COOKIE === '1') parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

// ---------- bootstrap ----------

/** สร้างผู้ดูแลคนแรกให้ตอนตาราง users ยังว่าง ไม่งั้นจะไม่มีใครล็อกอินเข้าไปสร้างใครได้ */
export async function ensureFirstUser() {
  const db = await getDb()
  const count = db.exec('SELECT COUNT(*) as c FROM users')[0]?.values[0][0] ?? 0
  if (count > 0) return

  const username = process.env.ADMIN_USERNAME || 'admin'
  const generated = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url')

  db.run(
    'INSERT INTO users (id, username, name, role, passwordHash, mustChangePassword, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [`usr-${crypto.randomUUID()}`, username.toLowerCase(), 'ผู้ดูแลระบบ', 'admin', await hashPassword(password), generated ? 1 : 0, new Date().toISOString()],
  )
  save(db)

  console.log('')
  console.log('  ┌─ สร้างบัญชีผู้ดูแลคนแรกแล้ว ─────────────────')
  console.log(`  │  username: ${username}`)
  console.log(`  │  password: ${password}`)
  if (generated) console.log('  │  (สุ่มให้ — เข้าระบบแล้วเปลี่ยนรหัสผ่านทันที)')
  console.log('  └──────────────────────────────────────────────')
  console.log('')
}

// ---------- middleware ----------

export async function requireAuth(req, res, next) {
  const token = readCookie(req, COOKIE_NAME)
  if (!token) return res.status(401).json({ error: 'unauthenticated' })

  const db = await getDb()
  const session = one(db.exec('SELECT * FROM sessions WHERE tokenHash=?', [hashToken(token)]))
  if (!session) return res.status(401).json({ error: 'unauthenticated' })

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.run('DELETE FROM sessions WHERE tokenHash=?', [session.tokenHash])
    save(db)
    return res.status(401).json({ error: 'session expired' })
  }

  const user = one(db.exec('SELECT * FROM users WHERE id=?', [session.userId]))
  if (!user) return res.status(401).json({ error: 'unauthenticated' })

  req.user = publicUser(user)
  req.sessionTokenHash = session.tokenHash
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'admin only' })
  next()
}

// ---------- login / logout ----------

/** นับรหัสผิดในหน่วยความจำ — พอสำหรับระบบที่รันได้ instance เดียวอยู่แล้ว */
const attempts = new Map()

function throttled(key) {
  const a = attempts.get(key)
  if (!a) return false
  if (Date.now() - a.at > LOCK_MS) {
    attempts.delete(key)
    return false
  }
  return a.count >= MAX_ATTEMPTS
}

function noteFailure(key) {
  const a = attempts.get(key)
  attempts.set(key, { count: a && Date.now() - a.at < LOCK_MS ? a.count + 1 : 1, at: Date.now() })
}

router.post('/api/auth/login', async (req, res) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  if (!username || !password) return res.status(400).json({ error: 'กรอกชื่อผู้ใช้และรหัสผ่าน' })

  const key = `${username}|${req.ip}`
  if (throttled(key)) {
    return res.status(429).json({ error: 'กรอกรหัสผิดหลายครั้งเกินไป ลองใหม่ในอีก 15 นาที' })
  }

  const db = await getDb()
  const user = one(db.exec('SELECT * FROM users WHERE username=?', [username]))
  // ตอบข้อความเดียวกันทั้งกรณีไม่มี user และรหัสผิด จะได้ไม่บอกใบ้ว่ามี username นี้อยู่จริง
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    noteFailure(key)
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' })
  }
  attempts.delete(key)

  const token = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  db.run('INSERT INTO sessions (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [
    hashToken(token),
    user.id,
    now.toISOString(),
    new Date(now.getTime() + SESSION_DAYS * 864e5).toISOString(),
  ])
  db.run('UPDATE users SET lastLoginAt=? WHERE id=?', [now.toISOString(), user.id])
  save(db)

  setSessionCookie(res, token)
  res.json({ user: publicUser(user) })
})

router.post('/api/auth/logout', async (req, res) => {
  const token = readCookie(req, COOKIE_NAME)
  if (token) {
    const db = await getDb()
    db.run('DELETE FROM sessions WHERE tokenHash=?', [hashToken(token)])
    save(db)
  }
  clearSessionCookie(res)
  res.json({ ok: true })
})

router.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

router.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const current = String(req.body?.currentPassword ?? '')
  const next = String(req.body?.newPassword ?? '')
  if (next.length < 8) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร' })

  const db = await getDb()
  const user = one(db.exec('SELECT * FROM users WHERE id=?', [req.user.id]))
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' })
  }

  db.run('UPDATE users SET passwordHash=?, mustChangePassword=0 WHERE id=?', [await hashPassword(next), user.id])
  // ตัด session อื่นทิ้ง เผื่อรหัสเดิมรั่ว — เหลือเฉพาะเครื่องที่เพิ่งเปลี่ยน
  db.run('DELETE FROM sessions WHERE userId=? AND tokenHash<>?', [user.id, req.sessionTokenHash])
  save(db)
  res.json({ ok: true })
})

// ---------- จัดการบัญชี (เฉพาะ admin) ----------

router.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb()
  const list = rows(db.exec('SELECT id, username, name, role, mustChangePassword, createdAt, lastLoginAt FROM users ORDER BY username'))
  res.json(list.map((u) => ({ ...publicUser(u), createdAt: u.createdAt ?? '', lastLoginAt: u.lastLoginAt ?? '' })))
})

router.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase()
  const name = String(req.body?.name ?? '').trim()
  const role = req.body?.role === 'admin' ? 'admin' : 'member'
  const password = String(req.body?.password ?? '')

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3-32 ตัว' })
  }
  if (password.length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' })

  const db = await getDb()
  if (one(db.exec('SELECT id FROM users WHERE username=?', [username]))) {
    return res.status(409).json({ error: 'มีชื่อผู้ใช้นี้อยู่แล้ว' })
  }

  const id = `usr-${crypto.randomUUID()}`
  db.run(
    'INSERT INTO users (id, username, name, role, passwordHash, mustChangePassword, createdAt) VALUES (?, ?, ?, ?, ?, 1, ?)',
    [id, username, name, role, await hashPassword(password), new Date().toISOString()],
  )
  save(db)
  res.json({ id })
})

router.put('/api/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  const password = String(req.body?.password ?? '')
  if (password.length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' })

  const db = await getDb()
  const user = one(db.exec('SELECT id FROM users WHERE id=?', [req.params.id]))
  if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' })

  db.run('UPDATE users SET passwordHash=?, mustChangePassword=1 WHERE id=?', [await hashPassword(password), user.id])
  db.run('DELETE FROM sessions WHERE userId=?', [user.id]) // เตะออกทุกเครื่อง
  save(db)
  res.json({ ok: true })
})

router.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const role = req.body?.role === 'admin' ? 'admin' : 'member'
  const db = await getDb()
  if (req.params.id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'ถอดสิทธิ์ผู้ดูแลของตัวเองไม่ได้' })
  }
  db.run('UPDATE users SET role=? WHERE id=?', [role, req.params.id])
  save(db)
  res.json({ ok: true })
})

router.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'ลบบัญชีตัวเองไม่ได้' })

  const db = await getDb()
  const admins = db.exec("SELECT COUNT(*) as c FROM users WHERE role='admin'")[0]?.values[0][0] ?? 0
  const target = one(db.exec('SELECT role FROM users WHERE id=?', [req.params.id]))
  if (target?.role === 'admin' && admins <= 1) {
    return res.status(400).json({ error: 'ต้องเหลือผู้ดูแลอย่างน้อย 1 คน' })
  }

  db.run('DELETE FROM sessions WHERE userId=?', [req.params.id])
  db.run('DELETE FROM users WHERE id=?', [req.params.id])
  save(db)
  res.json({ ok: true })
})
