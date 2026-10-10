import { useState } from 'react'
import { X } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

/** Shared modal for the two notes-only POST/PUT actions: Create Settlement, Generate Invoice. */
export default function NotesOnlyActionModal({ title, body, confirmLabel, onClose, onSubmit }) {
  const { theme } = useTenantBranding()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await onSubmit({ notes })
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between p-6 pb-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-3">
          {body ? <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{body}</p> : null}
          {error ? <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}
          <label className={labelCls}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} h-24`} />
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
            {saving ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
