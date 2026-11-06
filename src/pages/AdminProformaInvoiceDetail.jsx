import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Download,
  FileEdit,
  History,
  Receipt,
  Send,
  Wallet,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import {
  approveProformaInvoice,
  cancelProformaInvoice,
  convertProformaInvoiceToInvoice,
  fetchAdvancePayments,
  fetchProformaInvoicePreviewHtml,
  fetchProformaInvoiceRevisions,
  generateAdvanceReceiptPdf,
  generateProformaInvoicePdf,
  getProformaInvoice,
  issueProformaInvoice,
  recordAdvancePayment,
  rejectProformaInvoice,
  reviseProformaInvoice,
} from '../utils/proformaInvoices'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', placeholder: '' },
  { value: 'upi', label: 'UPI', placeholder: 'UPI transaction ID / UTR' },
  { value: 'card', label: 'Card', placeholder: 'Card transaction ID' },
  { value: 'bank_transfer', label: 'Bank Transfer', placeholder: 'Bank reference number' },
  { value: 'cheque', label: 'Cheque', placeholder: 'Cheque number' },
  { value: 'online_gateway', label: 'Online Payment Gateway', placeholder: 'Gateway transaction ID' },
  { value: 'other', label: 'Other', placeholder: 'Reference (optional)' },
]

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadgeStyle(status) {
  switch (status) {
    case 'draft': return 'bg-slate-100 text-slate-600'
    case 'issued': return 'bg-sky-100 text-sky-800'
    case 'approved': return 'bg-emerald-100 text-emerald-800'
    case 'rejected': return 'bg-rose-100 text-rose-800'
    case 'expired': return 'bg-amber-100 text-amber-900'
    case 'cancelled': return 'bg-slate-200 text-slate-600'
    case 'converted': return 'bg-violet-100 text-violet-800'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function advanceStatusStyle(status) {
  switch (status) {
    case 'received': return 'bg-emerald-100 text-emerald-800'
    case 'pending': return 'bg-amber-100 text-amber-900'
    case 'failed': return 'bg-rose-100 text-rose-800'
    case 'reversed': return 'bg-slate-200 text-slate-600'
    case 'refunded': return 'bg-violet-100 text-violet-800'
    default: return 'bg-slate-100 text-slate-600'
  }
}

// ── Reject modal ─────────────────────────────────────────────────────────────
function RejectProformaModal({ proforma, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    setBusy(true)
    try {
      const updated = await rejectProformaInvoice(proforma.id, { reason })
      showToast('success', 'Proforma invoice rejected.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to reject proforma invoice.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Proforma Invoice</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to reject <span className="font-semibold text-slate-800 dark:text-slate-200">{proforma.proforma_number}</span>?
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Reason <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
          <textarea
            rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer declined the estimate"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
            {busy ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cancel modal ──────────────────────────────────────────────────────────────
function CancelProformaModal({ proforma, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    setBusy(true)
    try {
      const updated = await cancelProformaInvoice(proforma.id, { reason })
      showToast('success', 'Proforma invoice cancelled.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to cancel proforma invoice.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Proforma Invoice</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to cancel <span className="font-semibold text-slate-800 dark:text-slate-200">{proforma.proforma_number}</span>?
          It cannot be converted to an invoice afterward.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Reason <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
          <textarea
            rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">Keep</button>
          <button type="button" onClick={handleConfirm} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
            {busy ? 'Cancelling…' : 'Cancel Proforma'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create revision modal ─────────────────────────────────────────────────────
function ReviseProformaModal({ proforma, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    if (!reason.trim()) { showToast('error', 'A revision reason is required.'); return }
    setBusy(true)
    try {
      const newVersion = await reviseProformaInvoice(proforma.id, { revision_reason: reason })
      showToast('success', `Revision v${newVersion.version} created.`)
      onSuccess(newVersion)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to create revision.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Revision</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          This creates a new draft version (v{proforma.version + 1}), re-snapshotted from the job card's
          <span className="font-semibold"> current</span> line items and totals. The original stays exactly as-is for audit history.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Revision reason <span className="text-rose-500">*</span></label>
          <textarea
            rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Additional work discovered — clutch replacement needed"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
            {busy ? 'Creating…' : 'Create Revision'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Revision history modal ────────────────────────────────────────────────────
function RevisionHistoryModal({ proformaId, onClose }) {
  const navigate = useNavigate()
  const [revisions, setRevisions] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProformaInvoiceRevisions(proformaId).then(setRevisions).catch((e) => setError(e.message))
  }, [proformaId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revision History</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        {!revisions ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {revisions.map((rev) => (
              <button
                key={rev.id} type="button"
                onClick={() => { onClose(); navigate(`/admin/proforma-invoices/${rev.id}`) }}
                className="flex w-full items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Version {rev.version}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{fmtMoney(rev.total_amount)}</p>
                  {rev.revision_reason ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{rev.revision_reason}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${statusBadgeStyle(rev.status)}`}>{rev.status}</span>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(rev.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700">
          Close
        </button>
      </div>
    </div>
  )
}

// ── Record advance payment modal ──────────────────────────────────────────────
function RecordAdvancePaymentModal({ proforma, onClose, onSuccess }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ amount: '', payment_mode: 'cash', payment_reference: '', remarks: '' })

  const modeMeta = PAYMENT_MODES.find((m) => m.value === form.payment_mode) || PAYMENT_MODES[0]
  // Matches the backend's cap in AdvancePaymentService.record() — shown here
  // as an upfront hint so the mistake (like entering more than the estimate
  // itself) is obvious before submitting, not just after a server error.
  const remainingBalance = Math.max(0, Number(proforma.total_amount || 0) - Number(proforma.advance_received_total || 0))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payment = await recordAdvancePayment(proforma.id, {
        amount: form.amount,
        payment_mode: form.payment_mode,
        payment_reference: form.payment_reference,
        remarks: form.remarks,
      })
      showToast('success', payment.status === 'pending' ? 'Advance payment recorded (awaiting confirmation).' : 'Advance payment recorded.')
      onSuccess(payment)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to record advance payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Advance Payment</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Against <span className="font-semibold text-slate-800 dark:text-slate-200">{proforma.proforma_number}</span> ({fmtMoney(proforma.total_amount)} estimate)
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Amount (₹)</label>
            <input
              type="number" step="0.01" min="0.01" max={remainingBalance} required
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-right text-sm tabular-nums outline-none focus:border-slate-400 dark:focus:border-slate-600"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Remaining balance: {fmtMoney(remainingBalance)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Payment mode</label>
            <select
              value={form.payment_mode}
              onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
              required
            >
              {PAYMENT_MODES.map(({ value, label }) => (<option key={value} value={value}>{label}</option>))}
            </select>
            {form.payment_mode === 'online_gateway' ? (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Recorded as pending — mark it received once you've confirmed the payment on your gateway dashboard.
              </p>
            ) : null}
          </div>
          {modeMeta.placeholder ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Reference <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span>
              </label>
              <input
                type="text"
                value={form.payment_reference}
                onChange={(e) => setForm((p) => ({ ...p, payment_reference: e.target.value }))}
                placeholder={modeMeta.placeholder}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Remarks <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
            <textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: theme.accent }}
            >
              {saving ? 'Saving…' : 'Save & Generate Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Advance payments section ──────────────────────────────────────────────────
function AdvancePaymentsSection({ proforma, canRecord, onChanged }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const [recordOpen, setRecordOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [payments, setPayments] = useState(proforma.advance_payments || [])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdvancePayments(proforma.id, { pageSize: 50 })
      setPayments(data.results || [])
    } catch {
      // keep whatever we already have — non-fatal for this section
    } finally {
      setLoading(false)
    }
  }, [proforma.id])

  useEffect(() => { setPayments(proforma.advance_payments || []) }, [proforma.advance_payments])

  const totalReceived = payments.filter((p) => p.status === 'received').reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const downloadReceipt = async (paymentId) => {
    setDownloadingId(paymentId)
    try {
      const { pdf_url } = await generateAdvanceReceiptPdf(paymentId, { force: true })
      if (pdf_url) globalThis.open(pdf_url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      showToast('error', err.message || 'Failed to generate receipt PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  const paymentsTable = (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Receipt No.</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Recorded By</th>
            <th className="px-4 py-3 text-center">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(p.created_at)}</td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{p.receipt_number || '—'}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(p.amount)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.payment_mode_display}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.payment_reference || '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${advanceStatusStyle(p.status)}`}>{p.status_display}</span>
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.received_by_name || '—'}</td>
              <td className="px-4 py-3 text-center">
                {p.receipt_number ? (
                  <button
                    type="button"
                    disabled={downloadingId === p.id}
                    onClick={() => downloadReceipt(p.id)}
                    title="Download receipt"
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <Receipt size={16} />
                  </button>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      {/* Compact strip only — the full payment table lives in a modal (same
          pattern as the Invoice detail page's "Payment History" modal) so this
          section never pushes the PDF preview further down the page as more
          advances get recorded. */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Wallet size={18} /> Advance Payments
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {payments.length > 0
              ? `${fmtMoney(totalReceived)} received so far.`
              : !canRecord && proforma.status === 'issued'
                ? 'Approve this proforma to start recording advances.'
                : 'No advances recorded yet.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {payments.length > 0 ? (
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Receipt size={15} /> View ({payments.length})
            </button>
          ) : null}
          {canRecord ? (
            <button
              type="button"
              onClick={() => setRecordOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              <Wallet size={15} /> Record Advance
            </button>
          ) : null}
        </div>
      </div>
      {loading ? <p className="px-5 pb-3 text-xs text-slate-400">Refreshing…</p> : null}

      {recordOpen ? (
        <RecordAdvancePaymentModal
          proforma={proforma}
          onClose={() => setRecordOpen(false)}
          onSuccess={() => { reload(); onChanged?.() }}
        />
      ) : null}

      {listOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Advance Payments</h3>
              <button type="button" onClick={() => setListOpen(false)} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">{paymentsTable}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ── Preview frame — same HTML used to generate the PDF ────────────────────────
function ProformaPreviewFrame({ html }) {
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(600)
  const srcDoc = html.replace('</head>', '<style>.no-print{display:none!important}</style></head>')

  const resize = () => {
    try {
      const doc = iframeRef.current?.contentWindow?.document
      const h = doc?.body?.scrollHeight
      if (h) setHeight(h + 24)
    } catch {
      // cross-origin or not-yet-ready — keep current height
    }
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      onLoad={resize}
      title="Proforma invoice preview"
      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-lg"
      style={{ height, border: 'none' }}
    />
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminProformaInvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [proforma, setProforma] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reviseOpen, setReviseOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [approving, setApproving] = useState(false)
  const [converting, setConverting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [data, html] = await Promise.all([getProformaInvoice(id), fetchProformaInvoicePreviewHtml(id)])
      setProforma(data)
      setPreviewHtml(html)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setError(e.message || 'Failed to load proforma invoice.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <AdminShell activeNav="proforma_invoices">
        <div className="mx-auto max-w-3xl py-20 text-center text-slate-500 dark:text-slate-400">Loading proforma invoice…</div>
      </AdminShell>
    )
  }

  if (error || !proforma) {
    return (
      <AdminShell activeNav="proforma_invoices">
        <div className="mx-auto max-w-3xl py-20 text-center">
          <p className="text-rose-600 dark:text-rose-400">{error || 'Proforma invoice not found.'}</p>
          <button type="button" onClick={() => navigate('/admin/proforma-invoices')} className="mt-4 text-sm underline text-slate-600 dark:text-slate-400">
            Back to Proforma Invoices
          </button>
        </div>
      </AdminShell>
    )
  }

  const status = proforma.status
  const canIssue = status === 'draft'
  const canApproveOrReject = status === 'issued'
  const canCancel = ['draft', 'issued', 'approved'].includes(status)
  const canRevise = ['issued', 'approved', 'rejected', 'expired'].includes(status)
  // The job card may already have a real invoice generated directly from the
  // job card itself (not via this proforma) — in that case converting would
  // just fail with "invoice already exists", and collecting further advances
  // against it can never be applied to anything. Hide both actions instead
  // of letting the user hit that error.
  const jobCardAlreadyInvoiced = ['invoiced', 'delivered'].includes(proforma.job_card_status)
  const canConvert = status === 'approved' && proforma.is_latest && !jobCardAlreadyInvoiced
  // Advances can only be recorded once 'approved' — not merely 'issued' —
  // so money is never collected against an estimate the customer hasn't
  // actually confirmed yet (and so it's never stranded if staff later
  // generate the invoice directly from the job card instead of converting
  // this proforma, since only conversion credits an advance into the invoice).
  const canRecordAdvance = status === 'approved' && !jobCardAlreadyInvoiced

  return (
    <>
      <AdminShell activeNav="proforma_invoices">
        <div className="w-full px-3 py-4 md:px-4">

          <nav className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link to="/admin/proforma-invoices" className="hover:text-slate-800 dark:hover:text-slate-200">Proforma Invoices</Link></li>
              <li aria-hidden>›</li>
              <li className="font-semibold text-slate-800 dark:text-slate-200">{proforma.proforma_number} (v{proforma.version})</li>
            </ol>
          </nav>

          {status === 'rejected' ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              <p className="text-sm font-bold tracking-wide">REJECTED{proforma.rejected_at ? ` · ${formatDateTime(proforma.rejected_at)}` : ''}</p>
              {proforma.rejection_reason ? <p className="mt-0.5 text-xs">Reason: {proforma.rejection_reason}</p> : null}
            </div>
          ) : status === 'cancelled' ? (
            <div className="mb-4 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <p className="text-sm font-bold tracking-wide">CANCELLED{proforma.cancelled_at ? ` · ${formatDateTime(proforma.cancelled_at)}` : ''}</p>
              {proforma.cancellation_reason ? <p className="mt-0.5 text-xs">Reason: {proforma.cancellation_reason}</p> : null}
            </div>
          ) : status === 'expired' ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200/80">
              <p className="text-sm font-bold tracking-wide">EXPIRED</p>
            </div>
          ) : null}

          {!proforma.is_latest ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              This is a superseded version. See the <button type="button" onClick={() => setHistoryOpen(true)} className="underline">revision history</button> for the latest version.
            </div>
          ) : null}

          {jobCardAlreadyInvoiced ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              The job card for this proforma has already been invoiced directly — converting this proforma or recording further advances against it is disabled.
            </div>
          ) : null}

          {proforma.invoice ? (
            <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900/40 dark:bg-violet-900/10 dark:text-violet-300">
              Converted to invoice{' '}
              <Link to={`/admin/invoices/${proforma.invoice}`} className="font-semibold underline">view invoice</Link>.
            </div>
          ) : null}

          <div className="mb-6">
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/proforma-invoices')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">Proforma Invoice Preview</h1>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${statusBadgeStyle(status)}`}>{status}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{proforma.proforma_number} · v{proforma.version} · {fmtMoney(proforma.total_amount)} estimate</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pdfLoading}
                onClick={async () => {
                  setPdfLoading(true)
                  try {
                    const { pdf_url } = await generateProformaInvoicePdf(proforma.id, { force: true })
                    window.open(pdf_url, '_blank', 'noopener,noreferrer')
                  } catch (err) {
                    showToast('error', err.message || 'Failed to generate PDF.')
                  } finally {
                    setPdfLoading(false)
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg text-white px-4 py-2 text-sm font-semibold shadow-md transition disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                <Download size={16} />
                {pdfLoading ? 'Generating…' : 'Download PDF'}
              </button>

              {canIssue ? (
                <button
                  type="button"
                  disabled={issuing}
                  onClick={async () => {
                    setIssuing(true)
                    try {
                      const updated = await issueProformaInvoice(proforma.id)
                      setProforma(updated)
                      showToast('success', 'Proforma invoice issued.')
                    } catch (err) {
                      showToast('error', err.message || 'Failed to issue proforma invoice.')
                    } finally {
                      setIssuing(false)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Send size={16} /> {issuing ? 'Issuing…' : 'Issue'}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <History size={16} /> History
              </button>

              {canRevise ? (
                <button
                  type="button"
                  onClick={() => setReviseOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <FileEdit size={16} /> Create Revision
                </button>
              ) : null}

              {canCancel ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <Ban size={16} /> Cancel
                </button>
              ) : null}

              <div className="ml-auto flex items-center gap-2">
                {canApproveOrReject ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900/50 dark:text-rose-400"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                    <button
                      type="button"
                      disabled={approving}
                      onClick={async () => {
                        setApproving(true)
                        try {
                          const updated = await approveProformaInvoice(proforma.id)
                          setProforma(updated)
                          showToast('success', 'Proforma invoice approved.')
                        } catch (err) {
                          showToast('error', err.message || 'Failed to approve proforma invoice.')
                        } finally {
                          setApproving(false)
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <CheckCircle2 size={16} /> {approving ? 'Approving…' : 'Approve'}
                    </button>
                  </>
                ) : null}

                {canConvert ? (
                  <button
                    type="button"
                    disabled={converting}
                    onClick={async () => {
                      setConverting(true)
                      try {
                        const invoice = await convertProformaInvoiceToInvoice(proforma.id)
                        showToast('success', `Invoice ${invoice.invoice_number} created.`)
                        navigate(`/admin/invoices/${invoice.id}`)
                      } catch (err) {
                        showToast('error', err.message || 'Failed to convert to an invoice.')
                      } finally {
                        setConverting(false)
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Wrench size={16} /> {converting ? 'Converting…' : 'Convert to Invoice'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <AdvancePaymentsSection proforma={proforma} canRecord={canRecordAdvance} onChanged={load} />

          {previewHtml ? (
            <ProformaPreviewFrame html={previewHtml} />
          ) : (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500">Loading preview…</div>
          )}

        </div>
      </AdminShell>

      {historyOpen && (
        <RevisionHistoryModal proformaId={proforma.id} onClose={() => setHistoryOpen(false)} />
      )}
      {rejectOpen && (
        <RejectProformaModal proforma={proforma} onClose={() => setRejectOpen(false)} onSuccess={setProforma} />
      )}
      {cancelOpen && (
        <CancelProformaModal proforma={proforma} onClose={() => setCancelOpen(false)} onSuccess={setProforma} />
      )}
      {reviseOpen && (
        <ReviseProformaModal
          proforma={proforma}
          onClose={() => setReviseOpen(false)}
          onSuccess={(newVersion) => navigate(`/admin/proforma-invoices/${newVersion.id}`)}
        />
      )}
    </>
  )
}
