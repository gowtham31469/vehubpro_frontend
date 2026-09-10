import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Banknote, Download, FileWarning, Loader2, ReceiptText, Wallet } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { downloadInvoiceReportCsv, fetchInvoiceReportSummary, fetchInvoices } from '../utils/invoices'

const PAGE_SIZE = 50

const PAYMENT_STATUS_OPTIONS = [
  { id: '', label: 'All Statuses' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'partial', label: 'Partial' },
  { id: 'paid', label: 'Paid' },
]

const INVOICE_TYPE_OPTIONS = [
  { id: '', label: 'All Types' },
  { id: 'gst', label: 'GST' },
  { id: 'non_gst', label: 'Non-GST' },
]

function paymentBadgeStyle(status) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'partial':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400'
    case 'unpaid':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
}

function paymentLabel(status) {
  return PAYMENT_STATUS_OPTIONS.find((s) => s.id === status)?.label || status
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const emptyFilters = { dateFrom: '', dateTo: '', paymentStatus: '', invoiceType: '' }
const emptyPageData = { count: 0, next: null, previous: null, results: [] }

function KpiCard({ icon: Icon, label, value, accent, accentSoft }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: accentSoft, color: accent }}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function AdminInvoiceReport() {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [filters, setFilters] = useState(emptyFilters)
  const [committedFilters, setCommittedFilters] = useState(null)
  const [summary, setSummary] = useState(null)
  const [pageData, setPageData] = useState(emptyPageData)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const datesMissing = !filters.dateFrom || !filters.dateTo

  const loadPage = async (targetPage, activeFilters) => {
    setPageLoading(true)
    try {
      const data = await fetchInvoices({
        page: targetPage,
        pageSize: PAGE_SIZE,
        dateFrom: activeFilters.dateFrom,
        dateTo: activeFilters.dateTo,
        paymentStatus: activeFilters.paymentStatus,
        invoiceType: activeFilters.invoiceType,
        includeCustomerName: true,
      })
      setPageData(data)
      setPage(targetPage)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setError(err.message || 'Failed to load report page.')
    } finally {
      setPageLoading(false)
    }
  }

  const generateReport = async (e) => {
    e.preventDefault()
    if (datesMissing) {
      setError('Date From and Date To are both required to generate a report.')
      return
    }
    setError('')
    setLoading(true)
    const activeFilters = { ...filters }
    try {
      const summaryData = await fetchInvoiceReportSummary(activeFilters)
      setSummary(summaryData)
      setCommittedFilters(activeFilters)
      await loadPage(1, activeFilters)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setError(err.message || 'Failed to generate report.')
      setSummary(null)
      setCommittedFilters(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!committedFilters) return
    setDownloading(true)
    try {
      await downloadInvoiceReportCsv(committedFilters)
      showToast('success', 'Report downloaded.')
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Failed to download report.')
    } finally {
      setDownloading(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:focus:border-slate-700"
  const labelCls = "mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400"

  return (
    <AdminShell activeNav="reports">
      <div className="mx-auto max-w-[1200px] space-y-5">
        {/* Header */}
        <div>
          <Link to="/admin/reports" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft size={15} /> Reports
          </Link>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Invoice Report</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Pick a date range (required) and filters, then generate the report. Large ranges are summarized and streamed from the server — nothing is loaded all at once.
          </p>
        </div>

        {/* Filters */}
        <form
          onSubmit={generateReport}
          className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <div>
            <label className={labelCls}>Date From <span className="text-rose-500">*</span></label>
            <input type="date" required value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date To <span className="text-rose-500">*</span></label>
            <input type="date" required value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Payment Status</label>
            <select value={filters.paymentStatus} onChange={(e) => setFilter('paymentStatus', e.target.value)} className={inputCls}>
              {PAYMENT_STATUS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Invoice Type</label>
            <select value={filters.invoiceType} onChange={(e) => setFilter('invoiceType', e.target.value)} className={inputCls}>
              {INVOICE_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || datesMissing}
              title={datesMissing ? 'Select both Date From and Date To' : undefined}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow transition disabled:opacity-50"
              style={{ backgroundColor: theme.accent }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!committedFilters || downloading}
              title={!committedFilters ? 'Generate a report first' : 'Download full report as CSV'}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            </button>
          </div>
        </form>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div>
        ) : null}

        {!summary ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <FileWarning size={32} className="text-slate-300 dark:text-slate-600" />
            <p className="mt-3 font-medium text-slate-600 dark:text-slate-400">No report generated yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400 dark:text-slate-500">
              Date From and Date To are required. Pick a range and click "Generate Report".
            </p>
          </div>
        ) : (
          <>
            {/* KPI summary — computed in the database, so this stays accurate and fast
                even when the matching row count is far larger than what's shown below. */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard icon={ReceiptText} label="Invoices" value={summary.count.toLocaleString('en-IN')} accent={theme.accent} accentSoft={theme.accentSoft} />
              <KpiCard icon={Banknote} label="Total Invoiced" value={fmtMoney(summary.total_invoiced)} accent={theme.accent} accentSoft={theme.accentSoft} />
              <KpiCard icon={Wallet} label="Total Collected" value={fmtMoney(summary.total_collected)} accent="#059669" accentSoft="rgba(5,150,105,0.12)" />
              <KpiCard icon={FileWarning} label="Outstanding" value={fmtMoney(summary.total_outstanding)} accent="#e11d48" accentSoft="rgba(225,29,72,0.12)" />
            </div>

            {/* Table preview — paginated (50 rows/page) so the browser never has to
                render the full matching set at once. The Download button above
                always exports every matching row, independent of this preview. */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Invoice No.</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4 text-right">Total</th>
                      <th className="px-5 py-4 text-right">Paid</th>
                      <th className="px-5 py-4 text-right">Balance</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                    {pageLoading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-slate-500 dark:text-slate-400">Loading…</td>
                      </tr>
                    ) : pageData.results.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-slate-500 dark:text-slate-400">
                          No invoices match the selected filters.
                        </td>
                      </tr>
                    ) : pageData.results.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.invoice_number}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatDate(row.created_at)}</td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{row.customer_name || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${row.invoice_type === 'gst' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {row.invoice_type === 'gst' ? 'GST' : 'Non-GST'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{fmtMoney(row.total_amount)}</td>
                        <td className="px-5 py-3 text-right text-emerald-700 dark:text-emerald-500">{fmtMoney(row.amount_paid)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-rose-700 dark:text-rose-500">{fmtMoney(row.balance_due)}</td>
                        <td className="px-5 py-3">
                          {row.is_cancelled ? (
                            <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">Cancelled</span>
                          ) : (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${paymentBadgeStyle(row.payment_status)}`}>
                              {paymentLabel(row.payment_status)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                <p>Showing {pageData.results.length} of {pageData.count.toLocaleString('en-IN')} invoices</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!pageData.previous || pageLoading}
                    onClick={() => loadPage(page - 1, committedFilters)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{page}</span>
                  <button
                    type="button"
                    disabled={!pageData.next || pageLoading}
                    onClick={() => loadPage(page + 1, committedFilters)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
