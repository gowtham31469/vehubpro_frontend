import { useState } from 'react'
import { CheckCircle2, Download, FileText, X } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { fetchSaleInvoicePreviewHtml, generateSaleInvoicePdf } from '../../utils/dealerInvoices'

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Replaces the bare notes-only form for "Generate Invoice" with a visual
 * draft preview (built from the sale/vehicle data already in hand — no
 * invoice exists yet) and, once generated, the real pixel-accurate invoice
 * preview (same template the PDF uses) with a Download button right there.
 */
export default function GenerateInvoiceModal({ sale, vehicle, onClose, onGenerate }) {
  const { theme, tenantName } = useTenantBranding()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generatedInvoice, setGeneratedInvoice] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const vehicleLabel = [vehicle?.year, vehicle?.brand_name, vehicle?.vehicle_model_name].filter(Boolean).join(' ')
  const discount = Number(sale.discount_amount || 0)
  const listingPrice = Number(vehicle?.listing_price || 0) || null

  const handleGenerate = async () => {
    setSaving(true)
    setError('')
    try {
      const invoice = await onGenerate({ notes })
      setGeneratedInvoice(invoice)
      setPreviewLoading(true)
      try {
        const html = await fetchSaleInvoicePreviewHtml(invoice.id)
        setPreviewHtml(html)
      } finally {
        setPreviewLoading(false)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    if (!generatedInvoice) return
    setDownloading(true)
    try {
      const { pdf_url } = await generateSaleInvoicePdf(generatedInvoice.id, { force: true })
      if (pdf_url) globalThis.open(pdf_url, '_blank', 'noopener,noreferrer')
    } catch {
      // Download button failing silently here is acceptable — the invoice
      // itself is already generated and visible in InvoiceSubpanel, where
      // Download Invoice can be retried.
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between p-6 pb-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {generatedInvoice ? 'Invoice Generated' : 'Generate Invoice'}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {generatedInvoice ? generatedInvoice.invoice_number : 'Review the details below, then generate'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4">
          {error ? <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

          {generatedInvoice ? (
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                <CheckCircle2 size={16} /> Invoice {generatedInvoice.invoice_number} created
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800">
                {previewLoading ? (
                  <div className="flex h-[70vh] items-center justify-center text-sm text-slate-400">Loading preview…</div>
                ) : (
                  <iframe
                    title="Invoice preview"
                    srcDoc={previewHtml}
                    className="h-[70vh] w-full bg-white"
                  />
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Draft preview card — mirrors the final PDF's layout so staff see
                  roughly what the customer will get before committing. */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
                <div className="h-2" style={{ backgroundColor: theme.accent }} />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{tenantName || 'Your Dealership'}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vehicle Sale Invoice</p>
                    </div>
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider"
                      style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
                    >
                      Draft · Not Generated
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billed To</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{sale.buyer_name || '—'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicle</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{vehicleLabel || '—'}</p>
                      {vehicle?.registration_no ? <p className="text-sm text-slate-500 dark:text-slate-400">Reg. No: {vehicle.registration_no}</p> : null}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
                    {listingPrice && listingPrice !== Number(sale.final_sale_price) ? (
                      <div className="flex items-center justify-between border-b border-slate-200/70 py-1.5 text-sm dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Listing Price (MRP)</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtMoney(listingPrice)}</span>
                      </div>
                    ) : null}
                    {discount > 0 ? (
                      <div className="flex items-center justify-between border-b border-slate-200/70 py-1.5 text-sm dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Discount Applied</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">− {fmtMoney(discount)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Sale Amount</span>
                      <span className="text-lg font-bold" style={{ color: theme.accent }}>{fmtMoney(sale.final_sale_price)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Any booking/reservation amount already collected is auto-credited as a payment on the invoice.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className={labelCls}>Notes (optional, appears on the invoice)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} h-24`} placeholder="e.g. Customer requested a hard copy for bank loan processing." />
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
          {generatedInvoice ? (
            <>
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Done</button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: theme.accent }}
              >
                <Download size={14} /> {downloading ? 'Preparing…' : 'Download PDF'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: theme.accent }}
              >
                <FileText size={14} /> {saving ? 'Generating…' : 'Generate Invoice'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
