import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconDashboard, IconFolder, IconBuilding, IconUsers, IconCloud, IconUser, IconPencil, IconArrowRight } from './Icons'
import ActionMenu from './ActionMenu'
import ChangePasswordModal from './ChangePasswordModal'
import { useAuth } from '../store/AuthStore'

export default function Header() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [pwOpen, setPwOpen] = useState(false)

  // รหัสที่ admin ตั้งให้เป็นรหัสชั่วคราว — เปิดหน้าต่างเปลี่ยนรหัสให้เลยตั้งแต่เข้าครั้งแรก
  useEffect(() => {
    if (user?.mustChangePassword) setPwOpen(true)
  }, [user?.mustChangePassword])

  const navItems = [
    { path: '/', label: 'แดชบอร์ด', Icon: IconDashboard, match: (p: string) => p === '/' },
    { path: '/projects', label: 'โปรเจกต์', Icon: IconFolder, match: (p: string) => p.startsWith('/projects') },
    { path: '/customers', label: 'ลูกค้า', Icon: IconBuilding, match: (p: string) => p.startsWith('/customers') },
    { path: '/team', label: 'ทีมงาน', Icon: IconUsers, match: (p: string) => p.startsWith('/team') },
  ]

  return (
    <header className="sticky top-0 z-50 glass border-b border-ink-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-glow transition-transform group-hover:scale-105">
              <IconCloud width={22} height={22} />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold text-ink-900 tracking-tight">Migration Tracker</h1>
              <p className="text-[11px] text-ink-500 font-medium">VM Cloud Server Migration</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 p-1 rounded-2xl bg-ink-100/70 ring-1 ring-ink-200/60">
            {navItems.map(({ path, label, Icon, match }) => {
              const active = match(location.pathname)
              return (
                <Link
                  key={path}
                  to={path}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-brand-700 shadow-soft'
                      : 'text-ink-500 hover:text-ink-800 hover:bg-white/60'
                  }`}
                >
                  <Icon width={17} height={17} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              )
            })}
          </nav>

          {user && (
            <ActionMenu
              ariaLabel="บัญชีผู้ใช้"
              icon={IconUser}
              label={user.name || user.username}
              buttonClassName="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-white/60 ring-1 ring-ink-200/60 transition-colors"
              items={[
                { label: 'เปลี่ยนรหัสผ่าน', icon: <IconPencil width={16} height={16} />, onClick: () => setPwOpen(true) },
                { label: 'ออกจากระบบ', icon: <IconArrowRight width={16} height={16} />, onClick: logout },
              ]}
            />
          )}
          </div>
        </div>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </header>
  )
}
