import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { createSaleInvoice, generateSaleInvoicePdf, getSaleInvoice, recordInvoicePayment } from '../../utils/dealerInvoices'
import NotesOnlyActionModal from './NotesOnlyActionModal'
import RecordSaleInvoicePaymentModal from './RecordSaleInvoicePaymentModal'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const PAYMENT_STATUS_STYLES = {
  unpaid: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

export default function InvoiceSubpanel({ sale, showToast }) {
  const { theme } = useTenantBranding()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const load = () => {
    setLoading(true)
    getSaleInvoice(sale.id)
      .then((data) => setInvoice(data))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false))
  }

  useEffect(load, [sale.id])

  const downloadInvoice = async (invoiceId) => {
    setDownloading(true)
    try {
      const { pdf_url } = await generateSaleInvoicePdf(invoiceId, { force: true })
      if (pdf_url) {
        globalThis.open(pdf_url, '_blank', 'noopener,noreferrer')
      } else {
        showToast('error', 'PDF was generated but no download link was returned.')
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to generate the invoice PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Invoice</p>
        {!loading && !invoice ? (
          <button type="button" onClick={() => setCreateModalOpen(true)} className="rounded-lg px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
            Generate Invoice
          </button>
        ) : null}
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : !invoice ? (
        <p className="text-sm text-slate-400">No invoice generated yet.</p>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice.invoice_number}</p>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PAYMENT_STATUS_STYLES[invoice.payment_status] || PAYMENT_STATUS_STYLES.unpaid}`}>
              {invoice.payment_status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {fmtMoney(invoice.amount_paid)} paid of {fmtMoney(invoice.sale_amount)}
          </p>

          {invoice.payments && invoice.payments.length > 0 ? (
            <div className="mt-2 space-y-1">
              {invoice.payments.map((p) => (
                <p key={p.id} className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtMoney(p.amount)} · {p.payment_mode_display} {p.payment_reference ? `· ${p.payment_reference}` : ''}
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadInvoice(invoice.id)}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
            >
              <Download size={13} /> {downloading ? 'Preparing…' : 'Download Invoice'}
            </button>
            {invoice.payment_status !== 'paid' ? (
              <button type="button" onClick={() => setPaymentModalOpen(true)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Record Payment
              </button>
            ) : null}
          </div>
        </div>
      )}

      {createModalOpen ? (
        <NotesOnlyActionModal
          title="Generate Invoice"
          confirmLabel="Generate Invoice"
          onClose={() => setCreateModalOpen(false)}
          onSubmit={async (payload) => {
            await createSaleInvoice(sale.id, payload)
            showToast('success', 'Invoice generated — use Download Invoice to get the PDF.')
            load()
          }}
        />
      ) : null}
      {paymentModalOpen && invoice ? (
        <RecordSaleInvoicePaymentModal
          invoice={invoice}
          onClose={() => setPaymentModalOpen(false)}
          onSubmit={async (payload) => {
            await recordInvoicePayment(invoice.id, payload)
            showToast('success', 'Payment recorded.')
            load()
          }}
        />
      ) : null}
    </div>
  )
}
