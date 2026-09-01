import { useState, type FormEvent } from 'react'
import { useAuth } from '../store/AuthStore'
import { IconCloud } from '../components/Icons'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-ink-50 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-400 focus:bg-white outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all'
const labelCls = 'block text-sm font-semibold text-ink-700 mb-1.5'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 bg-mesh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-glow mb-4">
            <IconCloud width={28} height={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">Migration Tracker</h1>
          <p className="text-sm text-ink-500 mt-1">ทีม Migrate &amp; Implement VM Cloud Server</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card p-6 space-y-4"
        >
          <div>
            <label className={labelCls} htmlFor="login-username">
              ชื่อผู้ใช้
            </label>
            <input
              id="login-username"
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="login-password">
              รหัสผ่าน
            </label>
            <input
              id="login-password"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600 bg-rose-50 ring-1 ring-rose-200/70 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft transition-colors disabled:opacity-60"
          >
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="text-center text-xs text-ink-400 mt-5">
          เข้าใช้งานได้เฉพาะสมาชิกในทีม — ติดต่อผู้ดูแลระบบเพื่อขอบัญชี
        </p>
      </div>
    </div>
  )
}
