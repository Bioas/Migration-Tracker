import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Team from './pages/Team'
import Customers from './pages/Customers'
import { ProjectProvider } from './store/ProjectStore'

/** รีเซ็ต animation ทุกครั้งที่เปลี่ยน route ด้วยการเปลี่ยน key */
function AnimatedRoutes() {
  const location = useLocation()
  // ใช้ fade แบบ opacity ล้วน ห้ามใช้ animation ที่มี transform ตรงนี้ — transform
  // (แม้เป็น identity ที่ค้างจาก fill-mode: both) จะกลายเป็น containing block
  // ทำให้ modal ที่เป็น position:fixed ข้างในไม่อิงกับ viewport
  return (
    <div key={location.pathname} className="animate-fade-in">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/team" element={<Team />} />
        <Route path="/customers" element={<Customers />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <ProjectProvider>
    <Router>
      <div className="min-h-screen bg-ink-50 bg-mesh">
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">
          <AnimatedRoutes />
        </main>
        <footer className="border-t border-ink-200/70 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-ink-500">
              Migration Tracker — ทีม Migrate &amp; Implement VM Cloud Server
            </p>
            <p className="text-xs text-ink-400">© 2026 · Cloud Migration Operations</p>
          </div>
        </footer>
      </div>
    </Router>
    </ProjectProvider>
  )
}
