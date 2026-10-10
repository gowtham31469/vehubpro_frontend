import { useState } from 'react'
import { X } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
]

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

export default function RecordSaleInvoicePaymentModal({ invoice, onClose, onSubmit }) {
  const { theme } = useTenantBranding()
  const outstanding = Math.max(0, Number(invoice.sale_amount) - Number(invoice.amount_paid || 0))
  const [form, setForm] = useState({ payment_mode: 'upi', amount: String(outstanding), payment_reference: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({ amount: form.amount, payment_mode: form.payment_mode, payment_reference: form.payment_reference || '' })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to record payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Payment</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={16} /></button>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Balance due: <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(outstanding)}</span>
        </p>
        {error ? <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelCls}>Payment mode</label>
            <select value={form.payment_mode} onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))} className={inputCls} required>
              {PAYMENT_MODES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Reference (optional)</label>
            <input value={form.payment_reference} onChange={(e) => setForm((p) => ({ ...p, payment_reference: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
