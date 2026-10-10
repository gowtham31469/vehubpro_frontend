import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { getVehicleAcquisition, saveVehicleAcquisition } from '../../utils/dealerAcquisitions'
import { addOwnershipRecord, fetchOwnershipHistory } from '../../utils/dealerOwnership'
import AddOwnershipRecordModal from './AddOwnershipRecordModal'

const ACQUISITION_METHODS = [
  { value: 'trade_in', label: 'Trade-In' },
  { value: 'auction', label: 'Auction' },
  { value: 'direct_purchase', label: 'Direct Purchase' },
  { value: 'other', label: 'Other' },
]

const COMMISSION_TYPES = [
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'price_difference', label: 'Price Difference' },
]

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function emptyForm() {
  return {
    acquisition_date: '', notes: '',
    seller_customer: '', seller_name: '', seller_phone: '', purchase_price: '', acquisition_method: 'direct_purchase',
    odometer_reading: '', purchase_reference: '',
    owner_customer: '', agreement_reference: '', owner_expected_price: '', commission_type: 'percentage',
    commission_value: '', agreement_start_date: '', agreement_end_date: '', terms: '',
  }
}

export default function VehicleAcquisitionTab({ vehicle }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const isConsignment = vehicle.inventory_type === 'customer_consignment'

  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getVehicleAcquisition(vehicle.id)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setForm({
            ...emptyForm(),
            ...data,
            seller_customer: data.seller_customer || '',
            owner_customer: data.owner_customer || '',
          })
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load acquisition.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicle.id])

  const loadHistory = () => {
    setHistoryLoading(true)
    fetchOwnershipHistory(vehicle.id)
      .then((data) => setHistory(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }

  useEffect(loadHistory, [vehicle.id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = isConsignment
        ? {
            acquisition_date: form.acquisition_date, notes: form.notes || null,
            owner_customer: form.owner_customer || null, agreement_reference: form.agreement_reference || null,
            owner_expected_price: form.owner_expected_price, commission_type: form.commission_type,
            commission_value: form.commission_value, agreement_start_date: form.agreement_start_date || null,
            agreement_end_date: form.agreement_end_date || null, terms: form.terms || null,
          }
        : {
            acquisition_date: form.acquisition_date, notes: form.notes || null,
            seller_customer: form.seller_customer || null, seller_name: form.seller_name || null,
            seller_phone: form.seller_phone || null, purchase_price: form.purchase_price,
            acquisition_method: form.acquisition_method, odometer_reading: form.odometer_reading || null,
            purchase_reference: form.purchase_reference || null,
          }
      await saveVehicleAcquisition(vehicle.id, payload)
      showToast('success', 'Acquisition details saved.')
    } catch (err) {
      setError(err.message || 'Failed to save acquisition details.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading acquisition details...</p>

  return (
    <div className="space-y-5">
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Acquisition — {isConsignment ? 'Customer Consignment' : 'Owned'}
        </p>
        {error ? <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Acquisition Date *</label>
            <input type="date" value={form.acquisition_date} onChange={(e) => setForm((p) => ({ ...p, acquisition_date: e.target.value }))} className={inputCls} required />
          </div>

          {isConsignment ? (
            <>
              <div className="sm:col-span-2">
                <label className={labelCls}>Owner Expected Price *</label>
                <input type="number" min="0" step="0.01" value={form.owner_expected_price} onChange={(e) => setForm((p) => ({ ...p, owner_expected_price: e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Agreement Reference</label>
                <input value={form.agreement_reference} onChange={(e) => setForm((p) => ({ ...p, agreement_reference: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Commission Type *</label>
                <select value={form.commission_type} onChange={(e) => setForm((p) => ({ ...p, commission_type: e.target.value }))} className={inputCls} required>
                  {COMMISSION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Commission Value *</label>
                <input type="number" min="0" step="0.01" value={form.commission_value} onChange={(e) => setForm((p) => ({ ...p, commission_value: e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Agreement Start Date</label>
                <input type="date" value={form.agreement_start_date} onChange={(e) => setForm((p) => ({ ...p, agreement_start_date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Agreement End Date</label>
                <input type="date" value={form.agreement_end_date} min={form.agreement_start_date || undefined} onChange={(e) => setForm((p) => ({ ...p, agreement_end_date: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Terms</label>
                <textarea value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} className={`${inputCls} h-20`} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Purchase Price *</label>
                <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => setForm((p) => ({ ...p, purchase_price: e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Acquisition Method *</label>
                <select value={form.acquisition_method} onChange={(e) => setForm((p) => ({ ...p, acquisition_method: e.target.value }))} className={inputCls} required>
                  {ACQUISITION_METHODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Seller Name</label>
                <input value={form.seller_name} onChange={(e) => setForm((p) => ({ ...p, seller_name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Seller Phone</label>
                <input value={form.seller_phone} onChange={(e) => setForm((p) => ({ ...p, seller_phone: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Odometer Reading (km)</label>
                <input type="number" min="0" value={form.odometer_reading} onChange={(e) => setForm((p) => ({ ...p, odometer_reading: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Purchase Reference</label>
                <input value={form.purchase_reference} onChange={(e) => setForm((p) => ({ ...p, purchase_reference: e.target.value }))} className={inputCls} />
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputCls} h-20`} />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
            {saving ? 'Saving...' : 'Save Acquisition'}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Ownership History</p>
          <button type="button" onClick={() => setAddModalOpen(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
            <Plus size={14} /> Add Record
          </button>
        </div>
        {historyLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-400">No ownership records yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((h) => (
              <div key={h.id} className="py-3">
                <p className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{h.owner_type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {h.owner_customer_name || h.owner_name || '—'} · {fmtDate(h.start_date)} – {fmtDate(h.end_date)}
                </p>
                {h.notes ? <p className="mt-1 text-xs italic text-slate-400">"{h.notes}"</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {addModalOpen ? (
        <AddOwnershipRecordModal
          onClose={() => setAddModalOpen(false)}
          onSubmit={async (payload) => {
            await addOwnershipRecord(vehicle.id, payload)
            showToast('success', 'Ownership record added.')
            loadHistory()
          }}
        />
      ) : null}
    </div>
  )
}
