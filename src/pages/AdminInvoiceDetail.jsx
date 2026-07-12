import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CreditCard,
  Download,
  History,
  Mail,
} from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { generateInvoicePdf, getInvoice, recordPayment } from '../utils/invoices'

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

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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

// ── Invoice document (print-ready) ────────────────────────────────────────────
function InvoiceDocument({ invoice, theme, brandingLogoUrl }) {
  const isPaid = invoice.payment_status === 'paid'
  const isPartial = invoice.payment_status === 'partial'
  const balance = Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid || 0))

  // Compute GST total
  const totalGst = Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0) + Number(invoice.igst_amount || 0)

  // derive a tax % label if possible from the lines
  const gstRates = [...new Set((invoice.line_items || []).map((l) => Number(l.gst_percentage)).filter(Boolean))]
  const gstLabel = gstRates.length === 1 ? `${gstRates[0]}%` : 'GST'

  return (
    <div
      id="invoice-print"
      className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg print:rounded-none print:border-0 print:shadow-none"
    >
      {/* Paid watermark stripe */}
      {isPaid && (
        <div className="absolute left-0 right-0 top-0 z-10 bg-emerald-500 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          Fully Paid
        </div>
      )}

      <div className="px-10 pt-10 pb-8" style={{ paddingTop: isPaid ? '28px' : '40px' }}>

        {/* ── Top: Brand + Invoice label ── */}
        <div className="flex items-stretch justify-between gap-6">
          {/* Left: Company */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {brandingLogoUrl ? (
                <img src={brandingLogoUrl} alt="Logo" className="h-12 w-auto object-contain" />
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: theme.accent ?? '#1e3a8a' }}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M4 13h16M6 10l1.5-4h9L18 10M5 13v6a1 1 0 001 1h2a1 1 0 001-1v-4h6v4a1 1 0 001 1h2a1 1 0 001-1v-6" />
                  </svg>
                </div>
              )}
              <span className="text-xl font-black uppercase tracking-tight text-slate-900 ml-1">
                {invoice.tenant_name_snapshot || 'AUTOCARE PRO'}
              </span>
            </div>
            <div className="mt-4 space-y-0.5 text-xs text-slate-500 leading-relaxed font-medium max-w-[280px]">
              {invoice.tenant_address_snapshot && (
                <p className="whitespace-pre-wrap">{invoice.tenant_address_snapshot}</p>
              )}
              {invoice.tenant_gstin_snapshot && (
                <p className="mt-2 font-bold text-slate-600">GSTIN: {invoice.tenant_gstin_snapshot}</p>
              )}
            </div>
          </div>

          {/* Right: Invoice title + meta */}
          <div className="flex flex-col justify-between items-end text-right">
            <div>
              <p className="text-4xl font-black uppercase tracking-tight leading-none" style={{ color: theme.accent ?? '#1e3a8a' }}>
                INVOICE
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">#{invoice.invoice_number}</p>
            </div>
            <div className="mt-6 flex gap-6 text-left">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Date Issued</p>
                <p className="mt-0.5 text-xs font-bold text-slate-700">{formatDate(invoice.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Job Card</p>
                <p className="mt-0.5 text-xs font-bold text-slate-700">
                  {invoice.job_card ? `#${String(invoice.job_card).slice(0, 8).toUpperCase()}` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-7 h-px bg-slate-100" />

        {/* ── Bill To + Vehicle Details ── */}
        <div className="grid grid-cols-2 gap-8">
          {/* Customer */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Bill To</p>
            {invoice.is_pii_erased ? (
              <p className="mt-1 text-sm text-slate-400 italic">[Customer data erased]</p>
            ) : (
              <>
                <p className="mt-1 text-base font-bold text-slate-900">{invoice.customer_name || '—'}</p>
                <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium leading-relaxed max-w-[250px]">
                  {invoice.customer_address && <p className="whitespace-pre-wrap">{invoice.customer_address}</p>}
                  {invoice.customer_phone && <p>{invoice.customer_phone}</p>}
                  {invoice.customer_email && <p>{invoice.customer_email}</p>}
                  {invoice.customer_gstin && <p className="font-semibold text-slate-600">GSTIN: {invoice.customer_gstin}</p>}
                </div>
              </>
            )}
          </div>

          {/* Vehicle */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Vehicle Details</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.05em] text-slate-400">Make / Model</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{invoice.vehicle_label_snapshot || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.05em] text-slate-400">License Plate</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">{invoice.vehicle_registration_no_snapshot || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.05em] text-slate-400">VIN</p>
                <p className="mt-0.5 font-mono text-xs font-bold text-slate-900">{invoice.vehicle_vin_snapshot || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.05em] text-slate-400">Odometer</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">
                  {invoice.vehicle_odometer_snapshot ? `${invoice.vehicle_odometer_snapshot.toLocaleString()} km` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-7 border-t border-slate-300" />

        {/* ── Line items table ── */}
        {(invoice.line_items || []).length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No line items on this invoice.</p>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6">
            {/* Header */}
            <p className="border-b border-slate-200 pb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Description</p>
            <p className="border-b border-slate-200 pb-2 text-right text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Qty / Hrs</p>
            <p className="border-b border-slate-200 pb-2 text-right text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Unit Price</p>
            <p className="border-b border-slate-200 pb-2 text-right text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Amount</p>

            {/* Rows */}
            {(invoice.line_items || []).map((line) => (
              <React.Fragment key={line.id}>
                <div className="border-b border-slate-100 py-4">
                  <p className="text-sm font-bold text-slate-900">{line.description}</p>
                  {line.detail_text && (
                    <p className="mt-0.5 text-xs italic text-slate-500">{line.detail_text}</p>
                  )}
                  {line.hsn_sac_code && (
                    <p className="mt-0.5 text-[10px] text-slate-400">HSN/SAC: {line.hsn_sac_code}</p>
                  )}
                </div>
                <p className="border-b border-slate-100 py-4 text-right text-sm tabular-nums text-slate-700">{Number(line.quantity)}</p>
                <p className="border-b border-slate-100 py-4 text-right text-sm tabular-nums text-slate-700">{fmtMoney(line.unit_price)}</p>
                <p className="border-b border-slate-100 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">{fmtMoney(line.line_total)}</p>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Bottom: Notes + Totals ── */}
        <div className="mt-6 space-y-3">
          {/* Notes */}
          {invoice.notes && (
            <div className="border-l-4 border-sky-500 bg-sky-50 px-4 py-4 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-widest text-sky-700">Technician Notes</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-700">"{invoice.notes}"</p>
            </div>
          )}

          {/* Financials — same grid as line items so columns align */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-sm">
              <span /><span />
              <span className="text-right text-slate-500">Subtotal</span>
              <span className="text-right tabular-nums font-medium text-slate-800">{fmtMoney(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-sm">
                <span /><span />
                <span className="text-right text-slate-500">Discount</span>
                <span className="text-right tabular-nums font-medium text-rose-600">−{fmtMoney(invoice.discount_amount)}</span>
              </div>
            )}
            {totalGst > 0 && (
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-sm">
                <span /><span />
                <span className="text-right text-slate-500">
                  {Number(invoice.cgst_amount) > 0 && Number(invoice.sgst_amount) > 0
                    ? `CGST + SGST (${gstLabel})`
                    : `GST (${gstLabel})`}
                </span>
                <span className="text-right tabular-nums text-slate-700">{fmtMoney(totalGst)}</span>
              </div>
            )}
            {Number(invoice.shop_fees) > 0 && (
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-sm">
                <span /><span />
                <span className="text-right text-slate-500">Shop fees</span>
                <span className="text-right tabular-nums text-slate-700">{fmtMoney(invoice.shop_fees)}</span>
              </div>
            )}
            <div
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 border-t border-slate-200 pt-3 text-base font-black"
              style={{ color: theme.accent }}
            >
              <span /><span />
              <span className="text-right">TOTAL DUE</span>
              <span className="text-right tabular-nums">{fmtMoney(invoice.total_amount)}</span>
            </div>

            {/* Payment status strip */}
            <div className={`mt-6 rounded-lg py-4 text-center text-[11px] font-black uppercase tracking-widest shadow-sm ${
              isPaid
                ? 'bg-emerald-50 text-emerald-700'
                : isPartial
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {isPaid
                ? '✓ Status: Fully Paid'
                : isPartial
                ? `◐ Status: Partially Paid · Balance ${fmtMoney(balance)}`
                : '○ Status: Unpaid'}
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {invoice.next_service_recommendation && (
          <div className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-5 py-4 shadow-sm rounded-r-lg">
            <p className="text-[7.5px] font-black uppercase tracking-widest text-amber-700 mb-2">💡 Next Service Recommendation</p>
            <p className="text-xs leading-relaxed text-slate-800">{invoice.next_service_recommendation}</p>
          </div>
        )}

        {/* ── Signatures Section ── */}
        {(invoice.customer_signature || invoice.admin_signature) && (
          <div className="mt-16 border-t-2 border-slate-100 pt-12 pb-4">
            <div className="grid grid-cols-2 gap-20 px-8">
              {/* Customer Signature */}
              <div className="text-center">
                <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-700 mb-24">Customer Signature</p>
                <div className="border-t-2 border-slate-900 h-24 flex items-end justify-center mb-2">
                  {invoice.customer_signature && (
                    <img src={invoice.customer_signature} alt="Customer Signature" className="max-h-24 max-w-full object-contain" />
                  )}
                </div>
              </div>

              {/* Admin Signature */}
              <div className="text-center">
                <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-700 mb-24">Authorized By</p>
                <div className="border-t-2 border-slate-900 h-24 flex items-end justify-center mb-2">
                  {invoice.admin_signature && (
                    <img src={invoice.admin_signature} alt="Admin Signature" className="max-h-24 max-w-full object-contain" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Invoice footer ── */}
        <div className="mt-12 border-t-2 border-slate-100 pt-6 text-center">
          <p className="text-xs text-slate-600 leading-relaxed">Thank you for your business! We appreciate the opportunity to service your vehicle.</p>
          {invoice.customer_signature || invoice.admin_signature ? (
            <p className="mt-2 text-[9px] text-slate-500">✓ Signatures have been recorded.</p>
          ) : (
            <p className="mt-2 text-[9px] text-slate-500">This is a computer-generated invoice and does not require a signature.</p>
          )}
          {invoice.is_pii_erased && (
            <p className="mt-3 text-[9px] text-slate-500">Customer identity data removed per data protection request.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminInvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme, brandingLogoUrl } = useTenantBranding()
  const { showToast } = useToast()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getInvoice(id)
      setInvoice(data)
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
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">Invoice Preview</h1>
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
                </div>

                {/* Record payment button or status */}
                <div className="ml-auto">
                  {!isPaid ? (
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

            {/* ── Invoice document ── */}
            <InvoiceDocument invoice={invoice} theme={theme} brandingLogoUrl={brandingLogoUrl} />

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
    </>
  )
}
