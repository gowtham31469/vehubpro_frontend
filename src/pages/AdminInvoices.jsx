import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Search } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchInvoices } from '../utils/invoices'

const PAYMENT_TABS = [
  { id: '', label: 'All' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'partial', label: 'Partial' },
  { id: 'paid', label: 'Paid' },
]

function paymentBadgeStyle(status) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800'
    case 'partial':
      return 'bg-amber-100 text-amber-900'
    case 'unpaid':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function paymentLabel(status) {
  return PAYMENT_TABS.find((t) => t.id === status)?.label || status
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminInvoices() {
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const [paymentTab, setPaymentTab] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [listData, setListData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  // Debounce search
  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedSearch(search), 300)
    return () => globalThis.clearTimeout(t)
  }, [search])

  const loadList = useCallback(async (p = 1) => {
    setLoading(true)
    setListError('')
    try {
      const data = await fetchInvoices({ page: p, pageSize: 10, paymentStatus: paymentTab, search: debouncedSearch })
      setListData(data)
      setPage(p)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setListError(e.message)
    } finally {
      setLoading(false)
    }
  }, [paymentTab, debouncedSearch])

  useEffect(() => { loadList(1) }, [paymentTab, debouncedSearch, loadList])

  // Summary stats derived from list data (lightweight)
  const results = listData.results || []
  const totalCount = listData.count || 0

  return (
    <>
      <AdminShell activeNav="invoices">
        <div className="mx-auto max-w-[1200px] space-y-5">

          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Invoices</h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">GST-compliant tax invoices generated from completed job cards.</p>
            </div>
            <Link
              to="/admin/job-cards"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              <FileText size={17} />
              Go to Job Cards
            </Link>
          </div>

          {/* Payment status tabs */}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            {PAYMENT_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPaymentTab(id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  paymentTab === id ? 'text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                style={paymentTab === id ? { backgroundColor: theme.accent } : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or vehicle plate…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
            />
          </div>

          {/* Error */}
          {listError ? (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{listError}</div>
          ) : null}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Invoice no.</th>
                    <th className="px-5 py-4">Vehicle</th>
                    <th className="px-5 py-4">FY</th>
                    <th className="px-5 py-4 text-right">Total</th>
                    <th className="px-5 py-4 text-right">Paid</th>
                    <th className="px-5 py-4 text-right">Balance</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">Loading…</td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-14 text-center">
                        <p className="font-medium text-slate-600 dark:text-slate-400">No invoices found.</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Invoices are generated from completed job cards.{' '}
                          <Link to="/admin/job-cards" className="underline" style={{ color: theme.accent }}>
                            Go to Job Cards
                          </Link>
                        </p>
                      </td>
                    </tr>
                  ) : results.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/invoices/${row.id}`)}
                          className="font-semibold hover:underline"
                          style={{ color: theme.accent }}
                        >
                          {row.invoice_number}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{row.vehicle_label_snapshot || '—'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.vehicle_registration_no_snapshot || ''}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {row.fy_code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{fmtMoney(row.total_amount)}</td>
                      <td className="px-5 py-3 text-right text-emerald-700 dark:text-emerald-500">{fmtMoney(row.amount_paid)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-rose-700 dark:text-rose-500">{fmtMoney(row.balance_due)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${paymentBadgeStyle(row.payment_status)}`}>
                          {paymentLabel(row.payment_status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatDate(row.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            title="View invoice"
                            aria-label="View invoice"
                            className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => navigate(`/admin/invoices/${row.id}`)}
                          >
                            <FileText size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
              <p>Showing {results.length} of {totalCount} invoices</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!listData.previous}
                  onClick={() => loadList(page - 1)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>
                  {page}
                </span>
                <button
                  type="button"
                  disabled={!listData.next}
                  onClick={() => loadList(page + 1)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

        </div>
      </AdminShell>
    </>
  )
}
