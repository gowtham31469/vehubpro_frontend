import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Download,
  FileEdit,
  History,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import {
  approveQuotation,
  cancelQuotation,
  convertQuotationToJobCard,
  fetchQuotationPreviewHtml,
  generateQuotationPdf,
  getQuotation,
  getQuotationRevisions,
  rejectQuotation,
  reviseQuotation,
} from '../utils/quotations'

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
    case 'sent': return 'bg-sky-100 text-sky-800'
    case 'approved': return 'bg-emerald-100 text-emerald-800'
    case 'rejected': return 'bg-rose-100 text-rose-800'
    case 'expired': return 'bg-amber-100 text-amber-900'
    case 'cancelled': return 'bg-slate-200 text-slate-600'
    case 'converted': return 'bg-violet-100 text-violet-800'
    default: return 'bg-slate-100 text-slate-600'
  }
}

// ── Reject modal ─────────────────────────────────────────────────────────────
function RejectQuotationModal({ quotation, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    setBusy(true)
    try {
      const updated = await rejectQuotation(quotation.id, { reason })
      showToast('success', 'Quotation rejected.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to reject quotation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Quotation</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to reject <span className="font-semibold text-slate-800 dark:text-slate-200">{quotation.quotation_number}</span>?
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Reason <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer declined the estimate"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
            {busy ? 'Rejecting…' : 'Reject Quotation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cancel modal ──────────────────────────────────────────────────────────────
function CancelQuotationModal({ quotation, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    setBusy(true)
    try {
      const updated = await cancelQuotation(quotation.id, { reason })
      showToast('success', 'Quotation cancelled.')
      onSuccess(updated)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to cancel quotation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Quotation</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to cancel <span className="font-semibold text-slate-800 dark:text-slate-200">{quotation.quotation_number}</span>? It cannot be converted to a job card afterward.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Reason <span className="font-normal text-slate-400 dark:text-slate-600">(optional)</span></label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">Keep Quotation</button>
          <button type="button" onClick={handleConfirm} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
            {busy ? 'Cancelling…' : 'Cancel Quotation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create revision modal ─────────────────────────────────────────────────────
function ReviseQuotationModal({ quotation, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    if (!reason.trim()) {
      showToast('error', 'A revision reason is required.')
      return
    }
    setBusy(true)
    try {
      const newVersion = await reviseQuotation(quotation.id, { revision_reason: reason })
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
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          This creates a new draft version (v{quotation.version + 1}) copying every item from v{quotation.version}.
          The original stays exactly as-is for audit history — you'll edit the new version separately.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Revision reason <span className="text-rose-500">*</span></label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
function RevisionHistoryModal({ quotationId, onClose }) {
  const navigate = useNavigate()
  const [revisions, setRevisions] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getQuotationRevisions(quotationId).then(setRevisions).catch((e) => setError(e.message))
  }, [quotationId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revision History</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        {!revisions ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {revisions.map((rev) => (
              <button
                key={rev.id}
                type="button"
                onClick={() => { onClose(); navigate(`/admin/quotations/${rev.id}`) }}
                className="flex w-full items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Version {rev.version}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{fmtMoney(rev.total_amount)}</p>
                  {rev.revision_reason ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{rev.revision_reason}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeStyle(rev.status)}`}>{rev.status}</span>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(rev.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Preview frame — same HTML used to generate the PDF ────────────────────────
function QuotationPreviewFrame({ html }) {
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
      title="Quotation preview"
      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-lg"
      style={{ height, border: 'none' }}
    />
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminQuotationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [quotation, setQuotation] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reviseOpen, setReviseOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [converting, setConverting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [data, html] = await Promise.all([getQuotation(id), fetchQuotationPreviewHtml(id)])
      setQuotation(data)
      setPreviewHtml(html)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setError(e.message || 'Failed to load quotation.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <AdminShell activeNav="quotations">
        <div className="mx-auto max-w-3xl py-20 text-center text-slate-500 dark:text-slate-400">Loading quotation…</div>
      </AdminShell>
    )
  }

  if (error || !quotation) {
    return (
      <AdminShell activeNav="quotations">
        <div className="mx-auto max-w-3xl py-20 text-center">
          <p className="text-rose-600 dark:text-rose-400">{error || 'Quotation not found.'}</p>
          <button type="button" onClick={() => navigate('/admin/quotations')} className="mt-4 text-sm underline text-slate-600 dark:text-slate-400">
            Back to Quotations
          </button>
        </div>
      </AdminShell>
    )
  }

  const status = quotation.status
  const canEdit = status === 'draft'
  const canApproveOrReject = status === 'sent'
  const canCancel = status === 'draft' || status === 'sent' || status === 'approved'
  const canRevise = ['sent', 'approved', 'rejected', 'expired'].includes(status)
  const canConvert = status === 'approved' && quotation.is_latest

  return (
    <>
      <AdminShell activeNav="quotations">
        <div className="w-full px-3 py-4 md:px-4">

          <nav className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link to="/admin/quotations" className="hover:text-slate-800 dark:hover:text-slate-200">Quotations</Link></li>
              <li aria-hidden>›</li>
              <li className="font-semibold text-slate-800 dark:text-slate-200">{quotation.quotation_number} (v{quotation.version})</li>
            </ol>
          </nav>

          {status === 'rejected' ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              <p className="text-sm font-bold tracking-wide">REJECTED{quotation.rejected_at ? ` · ${formatDateTime(quotation.rejected_at)}` : ''}</p>
              {quotation.rejection_reason ? <p className="mt-0.5 text-xs">Reason: {quotation.rejection_reason}</p> : null}
            </div>
          ) : status === 'cancelled' ? (
            <div className="mb-4 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <p className="text-sm font-bold tracking-wide">CANCELLED{quotation.cancelled_at ? ` · ${formatDateTime(quotation.cancelled_at)}` : ''}</p>
              {quotation.cancellation_reason ? <p className="mt-0.5 text-xs">Reason: {quotation.cancellation_reason}</p> : null}
            </div>
          ) : status === 'expired' ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200/80">
              <p className="text-sm font-bold tracking-wide">EXPIRED</p>
            </div>
          ) : null}

          {!quotation.is_latest ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              This is a superseded version. See the <button type="button" onClick={() => setHistoryOpen(true)} className="underline">revision history</button> for the latest version.
            </div>
          ) : null}

          {quotation.job_card_id ? (
            <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900/40 dark:bg-violet-900/10 dark:text-violet-300">
              Converted to job card{' '}
              <Link to={`/admin/job-cards/${quotation.job_card_id}`} className="font-semibold underline">{quotation.job_card_number}</Link>.
            </div>
          ) : null}

          <div className="mb-6">
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/quotations')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">Quotation Preview</h1>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeStyle(status)}`}>{status}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{quotation.quotation_number} · v{quotation.version} · {fmtMoney(quotation.total_amount)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pdfLoading}
                onClick={async () => {
                  setPdfLoading(true)
                  try {
                    const { pdf_url } = await generateQuotationPdf(quotation.id, { force: true })
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

              {canEdit ? (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/quotations/${quotation.id}/edit`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <FileEdit size={16} /> Edit
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
                          const updated = await approveQuotation(quotation.id)
                          setQuotation(updated)
                          showToast('success', 'Quotation approved.')
                        } catch (err) {
                          showToast('error', err.message || 'Failed to approve quotation.')
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
                        const jobCard = await convertQuotationToJobCard(quotation.id)
                        showToast('success', `Job card ${jobCard.jobcard_number} created.`)
                        navigate(`/admin/job-cards/${jobCard.id}`)
                      } catch (err) {
                        showToast('error', err.message || 'Failed to convert to a job card.')
                      } finally {
                        setConverting(false)
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Wrench size={16} /> {converting ? 'Converting…' : 'Create Job Card'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {previewHtml ? (
            <QuotationPreviewFrame html={previewHtml} />
          ) : (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500">Loading preview…</div>
          )}

        </div>
      </AdminShell>

      {historyOpen && (
        <RevisionHistoryModal quotationId={quotation.id} onClose={() => setHistoryOpen(false)} />
      )}
      {rejectOpen && (
        <RejectQuotationModal quotation={quotation} onClose={() => setRejectOpen(false)} onSuccess={setQuotation} />
      )}
      {cancelOpen && (
        <CancelQuotationModal quotation={quotation} onClose={() => setCancelOpen(false)} onSuccess={setQuotation} />
      )}
      {reviseOpen && (
        <ReviseQuotationModal
          quotation={quotation}
          onClose={() => setReviseOpen(false)}
          onSuccess={(newVersion) => navigate(`/admin/quotations/${newVersion.id}/edit`)}
        />
      )}
    </>
  )
}
