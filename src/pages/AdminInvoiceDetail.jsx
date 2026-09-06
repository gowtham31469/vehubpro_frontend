import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CreditCard,
  Download,
  History,
  Mail,
  X,
} from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { cancelInvoice, fetchInvoicePreviewHtml, generateInvoicePdf, getInvoice, recordPayment } from '../utils/invoices'

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

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onSuccess }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    payment_mode: 'upi',
    amount_paid: String(Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid || 0))),
    payment_reference: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await recordPayment(invoice.id, {
        payment_mode: form.payment_mode,
        amount_paid: form.amount_paid,
        payment_reference: form.payment_reference,
      })
      showToast('success', 'Payment recorded.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to record payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Payment</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Balance due: <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid || 0)))}</span>
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Payment mode</label>
            <select
              value={form.payment_mode}
              onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
              required
            >
              {PAYMENT_MODES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Amount paid (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount_paid}
              onChange={(e) => setForm((p) => ({ ...p, amount_paid: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-right text-sm tabular-nums outline-none focus:border-slate-400 dark:focus:border-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Reference / Transaction ID <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
            <input
              type="text"
              value={form.payment_reference}
              onChange={(e) => setForm((p) => ({ ...p, payment_reference: e.target.value }))}
              placeholder="UPI ref, cheque no., bank TXN ID…"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: theme.accent }}
            >
              {saving ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : null}
              {saving ? 'Saving…' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Cancel invoice modal ─────────────────────────────────────────────────────
function CancelInvoiceModal({ invoice, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    setCancelling(true)
    try {
      const updated = await cancelInvoice(invoice.id, { reason })
      showToast('success', 'Invoice cancelled.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to cancel invoice.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Invoice</h3>
          <button type="button" onClick={onClose} aria-label="Close cancel modal" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to cancel <span className="font-semibold text-slate-800 dark:text-slate-200">#{invoice.invoice_number}</span>?
          It will be stamped CANCELLED on the PDF and excluded from active totals — the record itself is kept, never deleted.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Reason <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={cancelling} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">
            Keep Invoice
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={cancelling}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invoice preview (embeds the exact same HTML used to generate the PDF,
//     via the /preview-html/ endpoint, so the on-screen preview is always
//     pixel-identical to the download rather than a hand-maintained replica) ──
function InvoicePreviewFrame({ html }) {
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(600)

  // Hide the standalone document's own Back/Print toolbar — this page already
  // has its own Back / Download PDF actions above the preview.
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
      title="Invoice preview"
      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-lg"
      style={{ height, border: 'none' }}
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminInvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [invoice, setInvoice] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [data, html] = await Promise.all([getInvoice(id), fetchInvoicePreviewHtml(id)])
      setInvoice(data)
      setPreviewHtml(html)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setError(e.message || 'Failed to load invoice.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <AdminShell activeNav="invoices">
        <div className="mx-auto max-w-3xl py-20 text-center text-slate-500 dark:text-slate-400">Loading invoice…</div>
      </AdminShell>
    )
  }

  if (error || !invoice) {
    return (
      <AdminShell activeNav="invoices">
        <div className="mx-auto max-w-3xl py-20 text-center">
          <p className="text-rose-600 dark:text-rose-400">{error || 'Invoice not found.'}</p>
          <button type="button" onClick={() => navigate('/admin/invoices')} className="mt-4 text-sm underline text-slate-600 dark:text-slate-400">
            Back to Invoices
          </button>
        </div>
      </AdminShell>
    )
  }

  const isPaid = invoice.payment_status === 'paid'
  const isCancelled = invoice.is_cancelled
  const hasPayments = Number(invoice.amount_paid || 0) > 0

  return (
    <>
      <AdminShell activeNav="invoices">
          <div className="w-full px-3 py-4 md:px-4">

            {/* ── Breadcrumb ── */}
            <nav className="mb-4 text-sm text-slate-500 dark:text-slate-400 print:hidden">
              <ol className="flex flex-wrap items-center gap-1">
                <li>
                  <Link to="/admin/job-cards" className="hover:text-slate-800 dark:hover:text-slate-200">Job Cards</Link>
                </li>
                <li aria-hidden>›</li>
                <li className="font-semibold text-slate-800 dark:text-slate-200">#{invoice.invoice_number}</li>
              </ol>
            </nav>

            {isCancelled ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 print:hidden">
                <p className="text-sm font-bold tracking-wide">CANCELLED{invoice.cancelled_at ? ` · ${formatDateTime(invoice.cancelled_at)}` : ''}</p>
                {invoice.cancellation_reason ? <p className="mt-0.5 text-xs">Reason: {invoice.cancellation_reason}</p> : null}
                {invoice.cancelled_by_name ? <p className="mt-0.5 text-xs">By: {invoice.cancelled_by_name}</p> : null}
              </div>
            ) : null}

            {/* ── Page header ── */}
            <div className="mb-6 print:hidden">
              {/* Top row: Back button + Title */}
              <div className="mb-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/invoices')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  aria-label="Back"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Invoice Preview</h1>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${invoice.invoice_type === 'gst' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {invoice.invoice_type === 'gst' ? 'GST' : 'Non-GST'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">#{invoice.invoice_number}</p>
                </div>
              </div>

              {/* Action buttons: organized in a clean row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Primary action: Download PDF */}
                <button
                  type="button"
                  disabled={pdfLoading}
                  onClick={async () => {
                    setPdfLoading(true)
                    try {
                      const { pdf_url } = await generateInvoicePdf(invoice.id, { force: true })
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
                  {pdfLoading ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <Download size={16} />
                  )}
                  {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>

                {/* Secondary actions */}
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-2">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <History size={16} />
                    <span>History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('info', 'Email delivery is coming soon.')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Mail size={16} />
                    <span>Email</span>
                  </button>
                  {!isCancelled ? (
                    <button
                      type="button"
                      onClick={() => setCancelOpen(true)}
                      disabled={hasPayments}
                      title={hasPayments ? 'Invoices with recorded payments cannot be cancelled.' : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-rose-900/50 dark:bg-slate-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:disabled:hover:bg-slate-900/50"
                    >
                      <Ban size={16} />
                      <span>Cancel Invoice</span>
                    </button>
                  ) : null}
                </div>

                {/* Record payment button or status */}
                <div className="ml-auto">
                  {isCancelled ? (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      <Ban size={16} />
                      Cancelled
                    </div>
                  ) : !isPaid ? (
                    <button
                      type="button"
                      onClick={() => setPaymentOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <CreditCard size={16} />
                      Record Payment
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Fully Paid
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Invoice document — same HTML as the downloaded PDF ── */}
            {previewHtml ? (
              <InvoicePreviewFrame html={previewHtml} />
            ) : (
              <div className="py-20 text-center text-slate-400 dark:text-slate-500">Loading preview…</div>
            )}

            {/* ── Payment history modal ── */}
            {historyOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm print:hidden">
                <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment History</h3>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(false)}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      aria-label="Close"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {(!invoice.payments || invoice.payments.length === 0) ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {invoice.payments.map((payment) => (
                        <div key={payment.id} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {fmtMoney(payment.amount)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {payment.payment_mode?.replace('_', ' ').toUpperCase()}
                            </p>
                            {payment.payment_reference && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ref: {payment.payment_reference}</p>
                            )}
                          </div>
                          <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(payment.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setHistoryOpen(false)}
                    className="mt-5 w-full rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          </div>
      </AdminShell>

      {/* ── Payment modal ── */}
      {paymentOpen && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setPaymentOpen(false)}
          onSuccess={(updated) => setInvoice(updated)}
        />
      )}

      {/* ── Cancel invoice modal ── */}
      {cancelOpen && (
        <CancelInvoiceModal
          invoice={invoice}
          onClose={() => setCancelOpen(false)}
          onSuccess={() => { void load() }}
        />
      )}
    </>
  )
}
