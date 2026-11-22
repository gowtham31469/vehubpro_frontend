import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { cancelVendorBill, createVendorPayment, getVendorBill } from '../utils/vendors'

const PAYMENT_STATUS_LABELS = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' }
const PAYMENT_MODES = [
  { id: 'cash', name: 'Cash' },
  { id: 'upi', name: 'UPI' },
  { id: 'card', name: 'Card' },
  { id: 'bank_transfer', name: 'Bank Transfer' },
  { id: 'cheque', name: 'Cheque' },
]

function paymentBadgeStyle(status) {
  switch (status) {
    case 'paid': return 'bg-emerald-100 text-emerald-800'
    case 'partial': return 'bg-amber-100 text-amber-900'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

// ── Record payment modal ─────────────────────────────────────────────────────
function RecordPaymentModal({ bill, onClose, onSuccess }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const balanceDue = Number(bill.balance_due)
  const [amount, setAmount] = useState(String(balanceDue))
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentReference, setPaymentReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    try {
      await createVendorPayment({
        vendor_id: bill.vendor, vendor_bill_id: bill.id, amount: Number(amount),
        payment_mode: paymentMode, payment_date: paymentDate, payment_reference: paymentReference,
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Payment</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Against {bill.bill_number} · Balance due {fmtMoney(balanceDue)}</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {error ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}
          <div>
            <label className={labelCls}>Amount *</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
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

// ── Cancel bill modal ────────────────────────────────────────────────────────
function CancelBillModal({ bill, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const handleConfirm = async () => {
    setCancelling(true)
    try {
      await cancelVendorBill(bill.id, { reason })
      showToast('success', 'Bill cancelled.')
      onSuccess()
      onClose()
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel bill.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Bill</h3>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Cancel <span className="font-semibold text-slate-800 dark:text-slate-200">{bill.bill_number}</span>? The record is kept, never deleted.
        </p>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={cancelling} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Keep Bill</button>
          <button type="button" onClick={handleConfirm} disabled={cancelling} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {cancelling ? 'Cancelling…' : 'Cancel Bill'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminVendorBillDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTenantBranding()

  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getVendorBill(id)
      setBill(data)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setError(e.message || 'Failed to load vendor bill.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <AdminShell activeNav="vendor">
        <div className="mx-auto max-w-3xl py-20 text-center text-slate-500 dark:text-slate-400">Loading vendor bill…</div>
      </AdminShell>
    )
  }

  if (error || !bill) {
    return (
      <AdminShell activeNav="vendor">
        <div className="mx-auto max-w-3xl py-20 text-center">
          <p className="text-rose-600 dark:text-rose-400">{error || 'Vendor bill not found.'}</p>
          <button type="button" onClick={() => navigate('/admin/vendor-bills')} className="mt-4 text-sm underline text-slate-600 dark:text-slate-400">
            Back to Vendor Bills
          </button>
        </div>
      </AdminShell>
    )
  }

  const canRecordPayment = bill.status === 'issued' && bill.payment_status !== 'paid'
  const canCancel = bill.status === 'issued' && Number(bill.amount_paid) === 0

  return (
    <>
      <AdminShell activeNav="vendor">
        <div className="w-full px-3 py-4 md:px-4">

          <nav className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link to="/admin/vendor-bills" className="hover:text-slate-800 dark:hover:text-slate-200">Vendor Bills</Link></li>
              <li aria-hidden>›</li>
              <li className="font-semibold text-slate-800 dark:text-slate-200">{bill.bill_number}</li>
            </ol>
          </nav>

          {bill.status === 'cancelled' ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              <p className="text-sm font-bold tracking-wide">CANCELLED</p>
              {bill.cancellation_reason ? <p className="mt-0.5 text-xs">Reason: {bill.cancellation_reason}</p> : null}
              {bill.cancelled_by_name ? <p className="mt-0.5 text-xs">By: {bill.cancelled_by_name}</p> : null}
            </div>
          ) : null}

          <div className="mb-6">
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/vendor-bills')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{bill.bill_number}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {bill.vendor_name} {bill.vendor_bill_reference ? `· their ref: ${bill.vendor_bill_reference}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canCancel ? (
                <button type="button" onClick={() => setCancelOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900/50 dark:hover:bg-rose-950/30">
                  <Ban size={16} /> Cancel Bill
                </button>
              ) : null}
              {canRecordPayment ? (
                <button type="button" onClick={() => setPaymentOpen(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md" style={{ backgroundColor: theme.accent }}>
                  Record Payment
                </button>
              ) : null}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bill Date</p>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{formatDate(bill.bill_date)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Due Date</p>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{formatDate(bill.due_date)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payment Status</p>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${paymentBadgeStyle(bill.payment_status)}`}>{PAYMENT_STATUS_LABELS[bill.payment_status]}</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Taxable Amount</p>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{fmtMoney(bill.subtotal)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">GST</p>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{fmtMoney(Number(bill.cgst_amount) + Number(bill.sgst_amount) + Number(bill.igst_amount))}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total</p>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{fmtMoney(bill.total_amount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">TDS</p>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">-{fmtMoney(bill.tds_amount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Payable</p>
              <p className="mt-1 font-bold" style={{ color: theme.accent }}>{fmtMoney(bill.net_payable_amount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Balance Due</p>
              <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">{fmtMoney(bill.balance_due)}</p>
            </div>
          </div>

          {bill.description ? (
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{bill.description}</p>
          ) : null}

          {bill.attachment_url ? (
            <a href={bill.attachment_url} target="_blank" rel="noopener noreferrer" className="mb-4 inline-block text-sm font-semibold hover:underline" style={{ color: theme.accent }}>
              View vendor's bill attachment →
            </a>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment History</p>
            {bill.payments?.length ? (
              <div className="space-y-1.5">
                {bill.payments.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 text-sm ${p.is_voided ? 'opacity-50' : ''}`}>
                    <span className="text-slate-700 dark:text-slate-300">{p.payment_number} · {formatDate(p.payment_date)} · {p.payment_mode}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(p.amount)}{p.is_voided ? ' (voided)' : ''}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">No payments recorded yet.</p>}
          </div>

        </div>
      </AdminShell>

      {paymentOpen && (
        <RecordPaymentModal bill={bill} onClose={() => setPaymentOpen(false)} onSuccess={() => { void load() }} />
      )}
      {cancelOpen && (
        <CancelBillModal bill={bill} onClose={() => setCancelOpen(false)} onSuccess={() => { void load() }} />
      )}
    </>
  )
}
