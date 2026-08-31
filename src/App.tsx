import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Team from './pages/Team'
import Customers from './pages/Customers'
import { ProjectProvider } from './store/ProjectStore'

export default function App() {
  return (
    <ProjectProvider>
    <Router>
      <div className="min-h-screen bg-ink-50 bg-mesh">
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/team" element={<Team />} />
            <Route path="/customers" element={<Customers />} />
          </Routes>
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
