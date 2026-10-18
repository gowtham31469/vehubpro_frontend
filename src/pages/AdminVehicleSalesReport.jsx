import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Banknote, Car, Download, FileWarning, Loader2, Percent, TrendingUp, XCircle } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { downloadVehicleSalesReportCsv, fetchVehicleSalesReportRows, fetchVehicleSalesReportSummary } from '../utils/dealerSalesReport'

const PAGE_SIZE = 50

const INVENTORY_TYPE_OPTIONS = [
  { id: '', label: 'All Types' },
  { id: 'owned', label: 'Owned' },
  { id: 'customer_consignment', label: 'Consignment' },
]

const STATUS_OPTIONS = [
  { id: '', label: 'Confirmed + Cancelled' },
  { id: 'confirmed', label: 'Confirmed Only' },
  { id: 'cancelled', label: 'Cancelled Only' },
]

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPercent(n) {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toFixed(1)}%`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const emptyFilters = { dateFrom: '', dateTo: '', inventoryType: '', status: '' }
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
      <p className="mt-1 break-words text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function AdminVehicleSalesReport() {
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
      const data = await fetchVehicleSalesReportRows({
        page: targetPage, pageSize: PAGE_SIZE,
        dateFrom: activeFilters.dateFrom, dateTo: activeFilters.dateTo,
        inventoryType: activeFilters.inventoryType, status: activeFilters.status,
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
      const summaryData = await fetchVehicleSalesReportSummary(activeFilters)
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
      await downloadVehicleSalesReportCsv(committedFilters)
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
    <AdminShell>
      <div className="mx-auto max-w-[1200px] space-y-5">
        {/* Header */}
        <div>
          <Link to="/admin/portfolio/reports" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft size={15} /> Reports
          </Link>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Vehicle Sales Report</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Pick a date range (required) and filters, then generate the report. Profit is computed the same way as the vehicle's own Profitability panel.
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
            <label className={labelCls}>Inventory Type</label>
            <select value={filters.inventoryType} onChange={(e) => setFilter('inventoryType', e.target.value)} className={inputCls}>
              {INVENTORY_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={inputCls}>
              {STATUS_OPTIONS.map((o) => (
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
            {/* KPI summary — computed from the same rows as the table/CSV below, so they always agree. */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard icon={Car} label="Sales" value={summary.count.toLocaleString('en-IN')} accent={theme.accent} accentSoft={theme.accentSoft} />
              <KpiCard icon={Banknote} label="Total Sale Value" value={fmtMoney(summary.total_sale_value)} accent={theme.accent} accentSoft={theme.accentSoft} />
              <KpiCard icon={Percent} label="Total Discount" value={fmtMoney(summary.total_discount)} accent="#e8912b" accentSoft="rgba(232,145,43,0.12)" />
              <KpiCard icon={TrendingUp} label="Total Profit" value={fmtMoney(summary.total_profit)} accent="#059669" accentSoft="rgba(5,150,105,0.12)" />
              <KpiCard icon={Percent} label="Avg Margin" value={fmtPercent(summary.average_margin_percent)} accent="#7c3aed" accentSoft="rgba(124,58,237,0.12)" />
              <KpiCard icon={XCircle} label="Cancelled" value={summary.cancelled_count.toLocaleString('en-IN')} accent="#e11d48" accentSoft="rgba(225,29,72,0.12)" />
            </div>

            {/* Table preview — paginated so the browser never has to render the
                full matching set at once. Download always exports every row. */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Sale Date</th>
                      <th className="px-5 py-4">Vehicle</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Buyer</th>
                      <th className="px-5 py-4 text-right">Sale Amount</th>
                      <th className="px-5 py-4 text-right">Discount</th>
                      <th className="px-5 py-4 text-right">Profit</th>
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
                          No sales match the selected filters.
                        </td>
                      </tr>
                    ) : pageData.results.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatDate(row.sale_date)}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.vehicle_label}</p>
                          <p className="text-xs text-slate-400">{row.registration_no || '—'}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${row.inventory_type === 'customer_consignment' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                            {row.inventory_type === 'customer_consignment' ? 'Consignment' : 'Owned'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{row.buyer_name}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{fmtMoney(row.final_sale_price)}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{Number(row.discount_amount) > 0 ? fmtMoney(row.discount_amount) : '—'}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${row.profit !== null && Number(row.profit) < 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-700 dark:text-emerald-500'}`}>
                          {row.profit !== null ? `${Number(row.profit) < 0 ? '−' : ''}${fmtMoney(Math.abs(row.profit))}` : '—'}
                          {row.margin_percent !== null ? <span className="ml-1 font-normal text-slate-400">({fmtPercent(row.margin_percent)})</span> : null}
                        </td>
                        <td className="px-5 py-3">
                          {row.status === 'cancelled' ? (
                            <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">Cancelled</span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Confirmed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                <p>Showing {pageData.results.length} of {pageData.count.toLocaleString('en-IN')} sales</p>
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
