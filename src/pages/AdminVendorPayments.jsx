import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Search, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import {
  createVendorPayment,
  fetchVendorBills,
  fetchVendorPayments,
  fetchVendors,
  voidVendorPayment,
} from '../utils/vendors'

const PAYMENT_MODES = [
  { id: 'cash', name: 'Cash' },
  { id: 'upi', name: 'UPI' },
  { id: 'card', name: 'Card' },
  { id: 'bank_transfer', name: 'Bank Transfer' },
  { id: 'cheque', name: 'Cheque' },
]

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

// ── New payment modal ────────────────────────────────────────────────────────
function NewPaymentModal({ vendors, onClose, onSuccess }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const [vendorId, setVendorId] = useState('')
  const [bills, setBills] = useState([])
  const [vendorBillId, setVendorBillId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setVendorBillId('')
    if (!vendorId) { setBills([]); return }
    fetchVendorBills({ vendorId, pageSize: 100, status: 'issued' })
      .then((data) => setBills((data.results || []).filter((b) => b.payment_status !== 'paid')))
      .catch(() => setBills([]))
  }, [vendorId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!vendorId) { setError('Select a vendor.'); return }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return }

    setSaving(true)
    try {
      await createVendorPayment({
        vendor_id: vendorId,
        vendor_bill_id: vendorBillId || undefined,
        amount: Number(amount),
        payment_mode: paymentMode,
        payment_date: paymentDate,
        payment_reference: paymentReference,
        notes,
      })
      showToast('success', 'Payment recorded.')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to record payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Vendor Payment</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-3">
          {error ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

          <div>
            <label className={labelCls}>Vendor *</label>
            <SearchableSelect
              value={vendorId}
              options={vendors}
              onChange={setVendorId}
              placeholder="Select a vendor…"
              searchPlaceholder="Search vendors…"
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>

          <div>
            <label className={labelCls}>Against Bill <span className="font-normal text-slate-400">(optional — leave blank for an on-account/advance payment)</span></label>
            <SearchableSelect
              value={vendorBillId}
              options={bills.map((b) => ({ id: b.id, name: `${b.bill_number} — balance due ${fmtMoney(b.balance_due)}` }))}
              onChange={setVendorBillId}
              placeholder="On Account (no specific bill)"
              searchPlaceholder="Search bills…"
              disabled={!vendorId}
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>

          <div>
            <label className={labelCls}>Amount *</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0.00" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mode *</label>
              <SearchableSelect
                allowClear={false}
                value={paymentMode}
                options={PAYMENT_MODES}
                onChange={setPaymentMode}
                accent={theme.accent}
                accentSoft={theme.accentSoft}
              />
            </div>
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Reference</label>
            <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className={inputCls} placeholder="UTR / cheque number" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} h-16`} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Void payment modal ───────────────────────────────────────────────────────
function VoidPaymentModal({ payment, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [reason, setReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const handleConfirm = async () => {
    setVoiding(true)
    try {
      await voidVendorPayment(payment.id, { reason })
      showToast('success', 'Payment voided.')
      onSuccess()
      onClose()
    } catch (err) {
      showToast('error', err.message || 'Failed to void payment.')
    } finally {
      setVoiding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Void Payment</h3>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Void <span className="font-semibold text-slate-800 dark:text-slate-200">{payment.payment_number}</span> ({fmtMoney(payment.amount)})?
          {payment.vendor_bill ? ' This restores the balance on the bill it was recorded against.' : ''}
        </p>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={voiding} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Keep Payment</button>
          <button type="button" onClick={handleConfirm} disabled={voiding} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {voiding ? 'Voiding…' : 'Void Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminVendorPayments() {
  const { theme } = useTenantBranding()
  const [vendors, setVendors] = useState([])
  const [vendorId, setVendorId] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [listData, setListData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [newPaymentOpen, setNewPaymentOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState(null)

  useEffect(() => {
    fetchVendors({ pageSize: 'all', archived: false }).then((data) => setVendors(data.results || [])).catch(() => {})
  }, [])

  const loadList = useCallback(async (p = 1) => {
    setLoading(true)
    setListError('')
    try {
      const data = await fetchVendorPayments({ page: p, pageSize: 10, vendorId, paymentMode })
      setListData(data)
      setPage(p)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setListError(e.message)
    } finally {
      setLoading(false)
    }
  }, [vendorId, paymentMode])

  useEffect(() => { loadList(1) }, [vendorId, paymentMode, loadList])

  const results = listData.results || []
  const totalCount = listData.count || 0
  const vendorName = (id) => vendors.find((v) => v.id === id)?.name || '—'

  return (
    <AdminShell activeNav="vendor">
      <div className="mx-auto max-w-[1200px] space-y-5">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Vendor Payments</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Payments made to vendors — tied to a bill, or on-account.</p>
          </div>
          <button type="button" onClick={() => setNewPaymentOpen(true)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90" style={{ backgroundColor: theme.accent }}>
            + New Payment
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <SearchableSelect
              value={vendorId}
              options={vendors}
              onChange={setVendorId}
              placeholder="All Vendors"
              searchPlaceholder="Search vendors…"
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>
          <div className="w-52">
            <SearchableSelect
              value={paymentMode}
              options={PAYMENT_MODES}
              onChange={setPaymentMode}
              placeholder="All Modes"
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>
        </div>

        {listError ? <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{listError}</div> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="relative overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Payment No.</th>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Against</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Mode</th>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">Loading…</td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-14 text-center text-slate-500 dark:text-slate-400">No payments recorded yet.</td></tr>
                ) : results.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${p.is_voided ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{p.payment_number}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{vendorName(p.vendor)}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {p.vendor_bill ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">Bill</span> : <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">On Account</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{fmtMoney(p.amount)}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatDate(p.payment_date)}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 capitalize">{p.payment_mode?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{p.payment_reference || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center">
                        {p.is_voided ? (
                          <span className="text-xs font-bold text-slate-400">Voided</span>
                        ) : (
                          <button type="button" title="Void" className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setVoidTarget(p)}>
                            <RotateCcw size={16} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
            <p>Showing {results.length} of {totalCount} payments</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={!listData.previous} onClick={() => loadList(page - 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Prev</button>
              <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{page}</span>
              <button type="button" disabled={!listData.next} onClick={() => loadList(page + 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

      </div>

      {newPaymentOpen && <NewPaymentModal vendors={vendors} onClose={() => setNewPaymentOpen(false)} onSuccess={() => { void loadList(page) }} />}
      {voidTarget && <VoidPaymentModal payment={voidTarget} onClose={() => setVoidTarget(null)} onSuccess={() => { void loadList(page) }} />}
    </AdminShell>
  )
}
