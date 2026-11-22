import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, Search } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchVendorBills, fetchVendors } from '../utils/vendors'

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'issued', label: 'Issued' },
  { id: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_STATUS_LABELS = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' }
const PAYMENT_STATUS_OPTIONS = [
  { id: 'unpaid', name: 'Unpaid' },
  { id: 'partial', name: 'Partial' },
  { id: 'paid', name: 'Paid' },
]

function paymentBadgeStyle(status) {
  switch (status) {
    case 'paid': return 'bg-emerald-100 text-emerald-800'
    case 'partial': return 'bg-amber-100 text-amber-900'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminVendorBills() {
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const [searchParams] = useSearchParams()

  const [vendors, setVendors] = useState([])
  const [vendorId, setVendorId] = useState(searchParams.get('vendor_id') || '')
  const [statusTab, setStatusTab] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [listData, setListData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  useEffect(() => {
    fetchVendors({ pageSize: 'all', archived: false }).then((data) => setVendors(data.results || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedSearch(search), 300)
    return () => globalThis.clearTimeout(t)
  }, [search])

  const loadList = useCallback(async (p = 1) => {
    setLoading(true)
    setListError('')
    try {
      const data = await fetchVendorBills({ page: p, pageSize: 10, vendorId, status: statusTab, paymentStatus, search: debouncedSearch })
      setListData(data)
      setPage(p)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setListError(e.message)
    } finally {
      setLoading(false)
    }
  }, [vendorId, statusTab, paymentStatus, debouncedSearch])

  useEffect(() => { loadList(1) }, [vendorId, statusTab, paymentStatus, debouncedSearch, loadList])

  const results = listData.results || []
  const totalCount = listData.count || 0

  return (
    <AdminShell activeNav="vendor">
      <div className="mx-auto max-w-[1300px] space-y-5">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Vendor Bills</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Bills recorded against your vendors (accounts payable).</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/admin/vendor-bills/new${vendorId ? `?vendor_id=${vendorId}` : ''}`)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
            style={{ backgroundColor: theme.accent }}
          >
            + New Bill
          </button>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          {STATUS_TABS.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setStatusTab(id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${statusTab === id ? 'text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={statusTab === id ? { backgroundColor: theme.accent } : undefined}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bill number, vendor…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100" />
          </div>
          <div className="w-52">
            <SearchableSelect
              value={vendorId}
              options={vendors}
              onChange={setVendorId}
              placeholder="All Vendors"
              searchPlaceholder="Search vendors…"
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>
          <div className="w-52">
            <SearchableSelect
              value={paymentStatus}
              options={PAYMENT_STATUS_OPTIONS}
              onChange={setPaymentStatus}
              placeholder="All Payment Status"
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>
        </div>

        {listError ? <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{listError}</div> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Bill No.</th>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Net Payable</th>
                  <th className="px-5 py-4 text-right">Balance Due</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">Loading…</td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-14 text-center text-slate-500 dark:text-slate-400">No vendor bills found.</td></tr>
                ) : results.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => navigate(`/admin/vendor-bills/${b.id}`)} className="font-semibold hover:underline" style={{ color: theme.accent }}>{b.bill_number}</button>
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{b.vendor_name}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatDate(b.bill_date)}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{fmtMoney(b.net_payable_amount)}</td>
                    <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-300">{fmtMoney(b.balance_due)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${paymentBadgeStyle(b.payment_status)}`}>{PAYMENT_STATUS_LABELS[b.payment_status]}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${b.status === 'cancelled' ? 'bg-slate-200 text-slate-600' : 'bg-sky-100 text-sky-800'}`}>
                        {b.status === 'cancelled' ? 'Cancelled' : 'Issued'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center">
                        <button type="button" title="View" className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => navigate(`/admin/vendor-bills/${b.id}`)}>
                          <Eye size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
            <p>Showing {results.length} of {totalCount} bills</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={!listData.previous} onClick={() => loadList(page - 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Prev</button>
              <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{page}</span>
              <button type="button" disabled={!listData.next} onClick={() => loadList(page + 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

      </div>
    </AdminShell>
  )
}
