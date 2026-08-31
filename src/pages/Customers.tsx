import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../store/ProjectStore'
import { Customer } from '../types/project'
import CustomerFormModal from '../components/CustomerFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import ActionMenu from '../components/ActionMenu'
import {
  IconBuilding,
  IconPlus,
  IconPencil,
  IconTrash,
  IconFolder,
  IconUser,
  IconChevronRight,
} from '../components/Icons'

const tints = [
  'from-brand-500 to-brand-700',
  'from-navy-500 to-navy-700',
  'from-teal-500 to-emerald-600',
  'from-cyan-500 to-sky-600',
  'from-brand-400 to-navy-600',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'C'
}

export default function Customers() {
  const { customers, projects, addCustomer, updateCustomer, deleteCustomer } = useProjects()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [toDelete, setToDelete] = useState<Customer | null>(null)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (c: Customer) => {
    setEditing(c)
    setFormOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-glow">
            <IconBuilding width={22} height={22} />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">ลูกค้า</h2>
            <p className="text-ink-500 mt-0.5">ข้อมูลลูกค้าและโปรเจกต์ที่เราดูแล</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 shadow-soft px-4 py-2 rounded-xl transition-colors w-fit"
        >
          <IconPlus width={17} height={17} />
          เพิ่มลูกค้า
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20 rounded-2xl ring-1 ring-dashed ring-ink-300 bg-white/60">
          <p className="text-ink-500 mb-3">ยังไม่มีลูกค้า</p>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
            <IconPlus width={16} height={16} /> เพิ่มลูกค้า
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {customers.map((c, i) => {
            const custProjects = projects.filter((p) => p.customerId === c.id)
            const assetCount = custProjects.reduce((a, p) => a + p.assets.length, 0)
            return (
              <div key={c.id} className="group bg-white rounded-2xl ring-1 ring-ink-200/70 shadow-soft hover:shadow-card transition-all p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br ${tints[i % tints.length]} flex items-center justify-center text-white font-bold shadow-soft`}>
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-ink-900 truncate">{c.name}</h3>
                      <div className="shrink-0">
                        <ActionMenu
                          ariaLabel="ตัวเลือกลูกค้า"
                          buttonClassName="w-7 h-7 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 flex items-center justify-center transition-colors"
                          items={[
                            { label: 'แก้ไข', icon: <IconPencil width={16} height={16} />, onClick: () => openEdit(c) },
                            { label: 'ลบ', danger: true, icon: <IconTrash width={16} height={16} />, onClick: () => setToDelete(c) },
                          ]}
                        />
                      </div>
                    </div>
                    {c.industry && <p className="text-xs text-ink-500 mt-0.5">{c.industry}</p>}
                  </div>
                </div>

                <div className="space-y-1 text-sm text-ink-600 mb-4">
                  {c.contactName && <p className="truncate inline-flex items-center gap-1.5"><IconUser width={13} height={13} className="text-ink-400" /> {c.contactName}</p>}
                  {c.contactEmail && <p className="truncate text-ink-500">{c.contactEmail}</p>}
                  {c.contactPhone && <p className="truncate text-ink-500">{c.contactPhone}</p>}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 rounded-xl bg-ink-50 ring-1 ring-ink-200/60 py-2.5 text-center">
                    <p className="text-lg font-extrabold text-ink-900 tabular-nums">{custProjects.length}</p>
                    <p className="text-[11px] text-ink-500 font-medium">โปรเจกต์</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-ink-50 ring-1 ring-ink-200/60 py-2.5 text-center">
                    <p className="text-lg font-extrabold text-ink-900 tabular-nums">{assetCount}</p>
                    <p className="text-[11px] text-ink-500 font-medium">VM / Asset</p>
                  </div>
                </div>

                {custProjects.length > 0 && (
                  <div className="border-t border-ink-100 pt-3.5">
                    <p className="text-[11px] text-ink-400 uppercase tracking-wider font-semibold mb-2">โปรเจกต์</p>
                    <div className="space-y-1.5">
                      {custProjects.map((p) => (
                        <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-ink-50/70 hover:bg-brand-50 ring-1 ring-transparent hover:ring-brand-200/70 transition-all group/item">
                          <IconFolder width={14} height={14} className="text-ink-400 shrink-0" />
                          <span className="text-sm text-ink-700 group-hover/item:text-brand-700 truncate flex-1">{p.projectName}</span>
                          <IconChevronRight width={15} height={15} className="text-ink-300 group-hover/item:text-brand-500 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={(data) => {
          if (editing) updateCustomer(editing.id, data)
          else addCustomer(data)
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteCustomer(toDelete.id)}
        title="ลบลูกค้า"
        message={`ต้องการลบลูกค้า "${toDelete?.name}" ใช่หรือไม่? โปรเจกต์ที่เชื่อมอยู่จะถูกยกเลิกการเชื่อมโยง (ไม่ถูกลบ)`}
        confirmLabel="ลบลูกค้า"
      />
    </div>
  )
}
