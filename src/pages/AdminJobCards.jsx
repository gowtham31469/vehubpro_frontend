import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, CheckCircle2, Download, FileText, Loader2, Plus, Search, TrendingUp, Wrench } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchJobCards, fetchJobCardStats } from '../utils/jobCards'

const TABS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'open', label: 'Job Control' },
  { id: 'in_progress', label: 'Working / Ready for FI' },
  { id: 'completed', label: 'Job Completed' },
  { id: 'delivered', label: 'Invoice / Delivered' },
]

const STATUS_OPTIONS = [
  { value: 'job_control', label: 'Job Control' },
  { value: 'working', label: 'Working' },
  { value: 'ready_for_fi', label: 'Ready for FI' },
  { value: 'completed', label: 'Job Completed' },
  { value: 'invoiced', label: 'Invoice' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

function statusBadgeStyle(status) {
  switch (status) {
    case 'job_control':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
    case 'working':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
    case 'ready_for_fi':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'invoiced':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
    case 'delivered':
      return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-300'
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
  }
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || status
}

export default function AdminJobCards() {
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [listData, setListData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [stats, setStats] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const { showToast } = useToast()

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedSearch(search), 300)
    return () => globalThis.clearTimeout(t)
  }, [search])

  const loadList = useCallback(async (p = 1) => {
    setLoading(true)
    setListError('')
    try {
      const data = await fetchJobCards({ page: p, pageSize: 10, tab, search: debouncedSearch })
      setListData(data)
      setPage(p)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setListError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tab, debouncedSearch])

  useEffect(() => {
    loadList(1)
  }, [tab, debouncedSearch, loadList])

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchJobCardStats()
      setStats(s)
    } catch {
      setStats(null)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const fmtMoney = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const handleDownloadPdf = async (row) => {
    if (row.status === 'job_control') return
    setDownloadingId(row.id)
    try {
      const { generateJobCardPdf } = await import('../utils/jobCards')
      const { pdf_url } = await generateJobCardPdf(row.id)
      if (pdf_url) {
        globalThis.open(pdf_url, '_blank')
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to generate PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <>
      <AdminShell activeNav="job-cards">
        <div className="mx-auto max-w-[1200px] space-y-6 px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Job Cards Overview</h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">Real-time tracking and management of vehicle service cycles.</p>
            </div>
            <Link
              to="/admin/job-cards/new"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: theme.accent }}
            >
              <Plus size={18} strokeWidth={2.4} />
              Create Job Card
            </Link>
          </div>

          {stats ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: 'Total Active',
                  display: String(stats.total_active),
                  hint: 'Excl. delivered & cancelled',
                  icon: Activity,
                  iconBg: 'bg-blue-50 dark:bg-blue-900/30',
                  iconColor: 'text-blue-500 dark:text-blue-400',
                },
                {
                  label: 'In Workshop',
                  display: String(stats.in_workshop),
                  hint: 'Working + Ready for FI',
                  icon: Wrench,
                  iconBg: 'bg-amber-50 dark:bg-amber-900/30',
                  iconColor: 'text-amber-500 dark:text-amber-400',
                },
                {
                  label: 'Completed Today',
                  display: String(stats.completed_today),
                  hint: 'Marked completed today',
                  icon: CheckCircle2,
                  iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
                  iconColor: 'text-emerald-500 dark:text-emerald-400',
                },
                {
                  label: 'Rev. Estimated',
                  display: fmtMoney(stats.revenue_estimated),
                  hint: 'All non-cancelled jobs',
                  icon: TrendingUp,
                  iconBg: 'bg-violet-50 dark:bg-violet-900/30',
                  iconColor: 'text-violet-500 dark:text-violet-400',
                },
              ].map((card) => {
                const Icon = card.icon
                return (
                  <div key={card.label} className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                      <Icon size={18} className={card.iconColor} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{card.display}</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{card.hint}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  tab === id ? 'text-white shadow' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
                style={tab === id ? { backgroundColor: theme.accent } : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative max-w-md">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job cards, customer, vehicle…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
            />
          </div>

          {listError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
              {listError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Job number</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Vehicle</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Created</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                        <Loader2 size={24} className="mx-auto animate-spin" />
                        <span className="mt-2 block">Loading…</span>
                      </td>
                    </tr>
                  ) : (listData.results || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                        No job cards found.
                      </td>
                    </tr>
                  ) : (
                    (listData.results || []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <Link
                            to={`/admin/job-cards/${row.id}`}
                            className="font-bold transition hover:opacity-80"
                            style={{ color: theme.accent }}
                          >
                            {row.jobcard_number}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.customer_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{row.customer_phone || '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{row.vehicle_label || '—'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{row.vehicle_registration}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(row.total_amount)}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(row.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="Open job card"
                              aria-label="Open job card"
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                              onClick={() => navigate(`/admin/job-cards/${row.id}`)}
                            >
                              <FileText size={16} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              title={row.status === 'job_control' ? 'Download disabled during Job Control' : 'Download Job Card PDF'}
                              aria-label="Download Job Card PDF"
                              disabled={row.status === 'job_control' || downloadingId === row.id}
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
                              onClick={() => handleDownloadPdf(row)}
                            >
                              {downloadingId === row.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} strokeWidth={2} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
              <p>
                Showing {(listData.results || []).length} of {listData.count} jobs
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!listData.previous}
                  onClick={() => loadList(page - 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Prev
                </button>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: theme.accent }}>
                  {page}
                </span>
                <button
                  type="button"
                  disabled={!listData.next}
                  onClick={() => loadList(page + 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-800"
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
