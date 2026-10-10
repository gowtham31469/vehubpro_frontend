import { useState } from 'react'
import { X } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import CustomerPicker from '../CustomerPicker'

const OWNER_TYPES = [
  { value: 'previous_owner', label: 'Previous Owner' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'consignor', label: 'Consignor' },
  { value: 'buyer', label: 'Buyer' },
]

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

export default function AddOwnershipRecordModal({ onClose, onSubmit }) {
  const { theme } = useTenantBranding()
  const [form, setForm] = useState({
    owner_type: 'previous_owner', owner_customer: '', owner_name: '', start_date: '', end_date: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        owner_type: form.owner_type,
        owner_customer: form.owner_customer || null,
        owner_name: form.owner_name || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add ownership record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between p-6 pb-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Ownership Record</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-6 pt-3">
          {error ? <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Owner Type *</label>
              <select value={form.owner_type} onChange={(e) => setForm((p) => ({ ...p, owner_type: e.target.value }))} className={inputCls} required>
                {OWNER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <CustomerPicker value={form.owner_customer} onChange={(v) => setForm((p) => ({ ...p, owner_customer: v }))} label="Owner Customer (if applicable)" />
            <div>
              <label className={labelCls}>Owner Name (if not a system customer)</label>
              <input value={form.owner_name} onChange={(e) => setForm((p) => ({ ...p, owner_name: e.target.value }))} className={inputCls} placeholder="e.g. Previous Owner per RC" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date *</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputCls} h-20`} />
            </div>
          </div>
        </form>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
            {saving ? 'Saving...' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  )
}
