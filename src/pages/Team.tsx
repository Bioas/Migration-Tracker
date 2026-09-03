import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TeamMember } from '../types/project'
import { useProjects } from '../store/ProjectStore'
import ActionMenu from '../components/ActionMenu'
import ConfirmDialog from '../components/ConfirmDialog'
import TeamMemberFormModal from '../components/TeamMemberFormModal'
import UserAdminPanel from '../components/UserAdminPanel'
import { useAuth } from '../store/AuthStore'
import { IconBriefcase, IconWrench, IconChevronRight, IconClipboard, IconPlus, IconPencil, IconTrash } from '../components/Icons'

const avatarTints = [
  'from-brand-500 to-brand-700',
  'from-teal-500 to-emerald-600',
  'from-navy-500 to-navy-700',
  'from-brand-400 to-navy-600',
  'from-cyan-500 to-teal-600',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export default function Team() {
  const { projects, teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, setMemberProjects } =
    useProjects()
  const { user } = useAuth()
  // แหล่งความจริงเดียวคือ projectOwner — สมาชิก "ถือ" โปรเจกต์ที่ owner ตรงกับชื่อตัวเอง
  const projectsOf = (name: string) => projects.filter((p) => p.projectOwner === name)
  const [modal, setModal] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null })
  const [toDelete, setToDelete] = useState<TeamMember | null>(null)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex items-start sm:items-end justify-between gap-3 mb-8 animate-fade-up">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">ทีมงาน</h2>
          <p className="text-ink-500 mt-0.5">ทีม Migrate &amp; Implement VM Cloud Server</p>
        </div>
        <button
          onClick={() => setModal({ open: true, member: null })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          <IconPlus width={16} height={16} /> เพิ่มสมาชิก
        </button>
      </div>

      {teamMembers.length === 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card text-center py-14 mb-8">
          <p className="text-ink-500 mb-3">ยังไม่มีสมาชิกในทีม</p>
          <button
            onClick={() => setModal({ open: true, member: null })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <IconPlus width={16} height={16} /> เพิ่มสมาชิกคนแรก
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {teamMembers.map((member, i) => {
          const memberProjects = projectsOf(member.name)
          const totalTasks = memberProjects.reduce(
            (a, p) => a + p.phases.reduce((b, ph) => b + ph.tasks.length, 0),
            0
          )
          const isPM = member.role === 'Project Manager'
          return (
            <div
              key={member.id}
              className="group bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all p-6"
            >
              <div className="flex items-center gap-4 mb-5">
                <div
                  className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarTints[i % avatarTints.length]} flex items-center justify-center text-white font-bold text-lg shadow-soft`}
                >
                  {initials(member.name) || <IconWrench width={22} height={22} />}
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white ring-1 ring-ink-200 flex items-center justify-center text-ink-500">
                    {isPM ? <IconBriefcase width={13} height={13} /> : <IconWrench width={13} height={13} />}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-ink-900 truncate">{member.name}</h3>
                  <p className="text-sm text-ink-500">{member.role || '—'}</p>
                </div>
                <ActionMenu
                  ariaLabel="ตัวเลือกสมาชิก"
                  buttonClassName="w-7 h-7 shrink-0 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
                  items={[
                    { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => setModal({ open: true, member }) },
                    { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setToDelete(member) },
                  ]}
                />
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 rounded-xl bg-ink-50 ring-1 ring-ink-200/60 py-2.5 text-center">
                  <p className="text-lg font-extrabold text-ink-900 tabular-nums">{memberProjects.length}</p>
                  <p className="text-[11px] text-ink-500 font-medium">โปรเจกต์</p>
                </div>
                <div className="flex-1 rounded-xl bg-ink-50 ring-1 ring-ink-200/60 py-2.5 text-center">
                  <p className="text-lg font-extrabold text-ink-900 tabular-nums">{totalTasks}</p>
                  <p className="text-[11px] text-ink-500 font-medium">งานรวม</p>
                </div>
              </div>

              <div className="border-t border-ink-100 pt-4">
                <p className="text-[11px] text-ink-400 uppercase tracking-wider font-semibold mb-2.5">
                  โปรเจกต์ที่รับผิดชอบ
                </p>
                <div className="space-y-2">
                  {memberProjects.length === 0 && (
                    <p className="text-sm text-ink-400">ยังไม่ได้ดูแลโปรเจกต์ใด</p>
                  )}
                  {memberProjects.map((p) => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-ink-50/70 hover:bg-brand-50 ring-1 ring-transparent hover:ring-brand-200/70 transition-all group/item"
                    >
                      <span className="text-sm text-ink-700 group-hover/item:text-brand-700 truncate flex-1">
                        {p.projectName}
                      </span>
                      <IconChevronRight
                        width={16}
                        height={16}
                        className="text-ink-300 group-hover/item:text-brand-500 shrink-0"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Team Summary Table */}
      <div className="bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center gap-2.5">
          <IconClipboard width={18} height={18} className="text-brand-600" />
          <h3 className="text-base font-bold text-ink-900">สรุปงานของทีม</h3>
        </div>
        {/* min-w กันคอลัมน์บีบจนตัวหนังสือตัดคำตอนจอแคบ — ให้เลื่อนแนวนอนแทน */}
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-ink-50/60 text-ink-500">
                <th className="text-left py-3.5 px-6 font-semibold whitespace-nowrap">ชื่อ</th>
                <th className="text-left py-3.5 px-4 font-semibold whitespace-nowrap">ตำแหน่ง</th>
                <th className="text-left py-3.5 px-4 font-semibold whitespace-nowrap">โปรเจกต์</th>
                <th className="text-right py-3.5 px-6 font-semibold whitespace-nowrap">จำนวนงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {teamMembers.map((member, i) => {
                const memberProjects = projectsOf(member.name)
                const totalTasks = memberProjects.reduce(
                  (a, p) => a + p.phases.reduce((b, ph) => b + ph.tasks.length, 0),
                  0
                )
                return (
                  <tr key={member.id} className="hover:bg-ink-50/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarTints[i % avatarTints.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                        >
                          {initials(member.name)}
                        </span>
                        <span className="font-semibold text-ink-900 whitespace-nowrap">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-ink-600 whitespace-nowrap">{member.role || '—'}</td>
                    <td className="py-3.5 px-4 text-ink-600 whitespace-nowrap">{memberProjects.length} โปรเจกต์</td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg bg-brand-50 text-brand-700 font-bold tabular-nums ring-1 ring-brand-200/60">
                        {totalTasks}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="mt-8">
          <UserAdminPanel />
        </div>
      )}

      <TeamMemberFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, member: null })}
        initial={modal.member}
        projects={projects}
        onSubmit={(data) => {
          if (modal.member) updateTeamMember(modal.member.id, data)
          else addTeamMember(data)
          // เขียนความสัมพันธ์โปรเจกต์ลง projectOwner (แหล่งความจริงเดียว)
          setMemberProjects(data.name, data.projects)
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteTeamMember(toDelete.id)}
        title="ลบสมาชิก"
        message={`ต้องการลบ "${toDelete?.name}" ออกจากทีมใช่หรือไม่? โปรเจกต์ที่เขาเป็นผู้ดูแลจะยังคงชื่อเดิมไว้`}
        confirmLabel="ลบสมาชิก"
      />
    </div>
  )
}
