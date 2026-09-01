import Modal from './Modal'
import { IconTrash } from './Icons'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'ลบ',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/70 flex items-center justify-center">
          <IconTrash width={20} height={20} />
        </div>
        <p className="text-sm text-ink-600 leading-relaxed pt-1">{message}</p>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-soft transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
