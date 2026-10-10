import { useState } from 'react'
import { X } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'

const CATEGORIES = [
  'brake', 'engine', 'transmission', 'suspension', 'electrical', 'ac', 'tyre', 'battery', 'painting',
  'body_repair', 'denting', 'detailing', 'oil_change', 'general_service', 'accessories', 'interior',
  'glass', 'cleaning', 'transport', 'insurance', 'rto', 'documentation', 'other',
].map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))

const PROVIDER_TYPES = [
  'internal', 'external_garage', 'paint_shop', 'tyre_shop', 'body_shop', 'detailer', 'electrician', 'vendor', 'other',
].map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))

const STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

export default function WorkExpenseModal({ expense, onClose, onSubmit }) {
  const { theme } = useTenantBranding()
  const isEdit = Boolean(expense)
  const [form, setForm] = useState({
    category: expense?.category || 'general_service',
    description: expense?.description || '',
    amount: expense?.amount || '',
    expense_date: expense?.expense_date || new Date().toISOString().slice(0, 10),
    provider_name: expense?.provider_name || '',
    provider_type: expense?.provider_type || 'other',
    reference_number: expense?.reference_number || '',
    notes: expense?.notes || '',
    status: expense?.status || 'completed',
    receipt_file: null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (!payload.receipt_file) delete payload.receipt_file
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save work expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between p-6 pb-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Work Expense' : 'Add Work Expense'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-6 pt-3">
          {error ? <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Category *</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className={inputCls} required>
                {CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className={inputCls} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Expense Date *</label>
              <input type="date" value={form.expense_date} onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Status *</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className={inputCls} required>
                {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Provider Name</label>
              <input value={form.provider_name} onChange={(e) => setForm((p) => ({ ...p, provider_name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Provider Type</label>
              <select value={form.provider_type} onChange={(e) => setForm((p) => ({ ...p, provider_type: e.target.value }))} className={inputCls}>
                {PROVIDER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Reference Number</label>
              <input value={form.reference_number} onChange={(e) => setForm((p) => ({ ...p, reference_number: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Receipt</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setForm((p) => ({ ...p, receipt_file: e.target.files?.[0] || null }))} className={inputCls} />
              {expense?.receipt_url ? (
                <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline" style={{ color: theme.accent }}>
                  View current receipt
                </a>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputCls} h-20`} />
            </div>
          </div>
        </form>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
