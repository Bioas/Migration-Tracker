import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi, UNAUTHORIZED_EVENT, type AuthUser } from '../lib/api'

interface AuthValue {
  user: AuthUser | null
  /** true ระหว่างเช็ค session ตอนเปิดเว็บ — ยังไม่รู้ว่าล็อกอินอยู่ไหม */
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  /** เรียกหลังเปลี่ยนรหัสผ่าน เพื่อเคลียร์ flag mustChangePassword */
  refresh: () => void
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // session หมดอายุระหว่างใช้งาน — เด้งกลับหน้าล็อกอินแทนที่จะขึ้นหน้าว่าง
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const { user } = await authApi.login(username, password)
    setUser(user)
  }, [])

  const logout = useCallback(() => {
    authApi.logout().catch(() => {})
    setUser(null)
  }, [])

  const refresh = useCallback(() => {
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
  }, [])

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth ต้องอยู่ใน AuthProvider')
  return ctx
}
