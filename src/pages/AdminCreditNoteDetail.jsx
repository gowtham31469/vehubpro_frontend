import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, CheckCircle2, Download, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import {
  cancelCreditNote,
  fetchCreditNotePreviewHtml,
  generateCreditNotePdf,
  getCreditNote,
  markCreditNoteRefunded,
} from '../utils/creditNotes'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const REFUND_STATUS_LABELS = {
  not_applicable: 'Not Applicable',
  pending: 'Refund Pending',
  refunded: 'Refunded',
}

function refundBadgeStyle(refundStatus) {
  switch (refundStatus) {
    case 'pending': return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400'
    case 'refunded': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    default: return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  }
}

// ── Mark as refunded modal ──────────────────────────────────────────────────
function MarkRefundedModal({ creditNote, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const updated = await markCreditNoteRefunded(creditNote.id, { reason })
      showToast('success', 'Credit note marked as refunded.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to mark as refunded.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mark as Refunded</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Confirms that <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(creditNote.refund_amount)}</span> was manually refunded to the customer outside this system. This does not move any money — it only records that the refund took place.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Note <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Refunded via cash on 12 Nov"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving…' : 'Confirm Refunded'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cancel credit note modal ────────────────────────────────────────────────
function CancelCreditNoteModal({ creditNote, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    setCancelling(true)
    try {
      const updated = await cancelCreditNote(creditNote.id, { reason })
      showToast('success', 'Credit note cancelled.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to cancel credit note.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Credit Note</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to cancel <span className="font-semibold text-slate-800 dark:text-slate-200">{creditNote.credit_note_number}</span>?
          This restores the credited amount back to the original invoice's creditable balance — the record itself is kept, never deleted.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Reason <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Issued in error"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={cancelling} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">Keep Credit Note</button>
          <button type="button" onClick={handleConfirm} disabled={cancelling} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
            {cancelling ? 'Cancelling…' : 'Cancel Credit Note'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PDF preview (same template used for the download, via /preview-html/) ──
function CreditNotePreviewFrame({ html }) {
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
      title="Credit note preview"
      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-lg"
      style={{ height, border: 'none' }}
    />
  )
}

export default function AdminCreditNoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [creditNote, setCreditNote] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getCreditNote(id)
      setCreditNote(data)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setError(e.message || 'Failed to load credit note.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let cancelled = false
    fetchCreditNotePreviewHtml(id)
      .then((html) => { if (!cancelled) setPreviewHtml(html) })
      .catch((e) => {
        if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin' }
      })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <AdminShell activeNav="credit_note">
        <div className="mx-auto max-w-3xl py-20 text-center text-slate-500 dark:text-slate-400">Loading credit note…</div>
      </AdminShell>
    )
  }

  if (error || !creditNote) {
    return (
      <AdminShell activeNav="credit_note">
        <div className="mx-auto max-w-3xl py-20 text-center">
          <p className="text-rose-600 dark:text-rose-400">{error || 'Credit note not found.'}</p>
          <button type="button" onClick={() => navigate('/admin/credit-notes')} className="mt-4 text-sm underline text-slate-600 dark:text-slate-400">
            Back to Credit Notes
          </button>
        </div>
      </AdminShell>
    )
  }

  const isCancelled = creditNote.status === 'cancelled'
  const canCancel = !isCancelled && creditNote.refund_status !== 'refunded'
  const canMarkRefunded = creditNote.refund_status === 'pending'

  return (
    <>
      <AdminShell activeNav="credit_note">
        <div className="w-full px-3 py-4 md:px-4">

          <nav className="mb-4 text-sm text-slate-500 dark:text-slate-400 print:hidden">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link to="/admin/credit-notes" className="hover:text-slate-800 dark:hover:text-slate-200">Credit Notes</Link></li>
              <li aria-hidden>›</li>
              <li className="font-semibold text-slate-800 dark:text-slate-200">{creditNote.credit_note_number}</li>
            </ol>
          </nav>

          {isCancelled ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 print:hidden">
              <p className="text-sm font-bold tracking-wide">CANCELLED{creditNote.cancelled_at ? ` · ${formatDateTime(creditNote.cancelled_at)}` : ''}</p>
              {creditNote.cancellation_reason ? <p className="mt-0.5 text-xs">Reason: {creditNote.cancellation_reason}</p> : null}
              {creditNote.cancelled_by_name ? <p className="mt-0.5 text-xs">By: {creditNote.cancelled_by_name}</p> : null}
            </div>
          ) : null}

          <div className="mb-6 print:hidden">
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/credit-notes')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Credit Note</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {creditNote.credit_note_number} · Against invoice{' '}
                  <Link to={`/admin/invoices/${creditNote.invoice}`} className="hover:underline" style={{ color: theme.accent }}>
                    #{creditNote.invoice_number}
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pdfLoading}
                onClick={async () => {
                  setPdfLoading(true)
                  try {
                    const { pdf_url } = await generateCreditNotePdf(creditNote.id, { force: true })
                    window.open(pdf_url, '_blank', 'noopener,noreferrer')
                  } catch (err) {
                    showToast('error', err.message || 'Failed to generate PDF.')
                  } finally {
                    setPdfLoading(false)
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                <Download size={16} />
                {pdfLoading ? 'Generating…' : 'Download PDF'}
              </button>

              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-2">
                {canMarkRefunded ? (
                  <button
                    type="button"
                    onClick={() => setRefundOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-slate-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  >
                    <CheckCircle2 size={16} />
                    <span>Mark as Refunded</span>
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <Ban size={16} />
                    <span>Cancel Credit Note</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Credited</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{fmtMoney(creditNote.total_amount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Issued On</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatDateTime(creditNote.created_at)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Refund Status</p>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${refundBadgeStyle(creditNote.refund_status)}`}>
                {REFUND_STATUS_LABELS[creditNote.refund_status] || creditNote.refund_status}
              </span>
              {creditNote.refund_status === 'pending' ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fmtMoney(creditNote.refund_amount)} due back to customer</p>
              ) : null}
              {creditNote.refund_status === 'refunded' && creditNote.refunded_at ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">on {formatDateTime(creditNote.refunded_at)}</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reason</p>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-3">{creditNote.reason || '—'}</p>
            </div>
          </div>

          {/* ── Line items ── */}
          {creditNote.line_items?.length ? (
            <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 print:hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Qty</th>
                      <th className="px-5 py-3 text-right">Unit Price</th>
                      <th className="px-5 py-3 text-right">GST %</th>
                      <th className="px-5 py-3 text-right">Credited Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                    {creditNote.line_items.map((line) => (
                      <tr key={line.id}>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                          {line.description}
                          {!line.invoice_line_item ? <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">CUSTOM</span> : null}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{line.quantity}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{fmtMoney(line.unit_price)}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{line.gst_percentage}%</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{fmtMoney(line.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* ── PDF preview ── */}
          {previewHtml ? <CreditNotePreviewFrame html={previewHtml} /> : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 py-20 text-center text-slate-400 dark:text-slate-500">
              Loading preview…
            </div>
          )}

        </div>
      </AdminShell>

      {refundOpen && (
        <MarkRefundedModal
          creditNote={creditNote}
          onClose={() => setRefundOpen(false)}
          onSuccess={(updated) => setCreditNote(updated)}
        />
      )}

      {cancelOpen && (
        <CancelCreditNoteModal
          creditNote={creditNote}
          onClose={() => setCancelOpen(false)}
          onSuccess={() => { void load() }}
        />
      )}
    </>
  )
}
