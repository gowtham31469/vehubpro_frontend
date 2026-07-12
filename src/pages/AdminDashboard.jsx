import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CircleDollarSign, Users, WalletCards } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { hexToRgba } from '../utils/themeColors'
import {
  fetchDashboardSummary,
  fetchJobCardFunnel,
  fetchRecentActivity,
  fetchRevenueTrend,
} from '../utils/dashboard'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtCount(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('en-IN')
}

function monthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short' }).toUpperCase()
}

// ── SVG chart helpers ─────────────────────────────────────────────────────────

function buildSvgPath(points, w = 760, h = 230, pad = 20) {
  if (!points.length) return { line: '', area: '' }
  const maxV = Math.max(...points.map((p) => p.revenue), 1)
  const n = points.length

  // Single data point — draw a full-width horizontal line at that value level
  if (n === 1) {
    const y = h - pad - (points[0].revenue / maxV) * (h - 2 * pad)
    return {
      line: `M0,${y} L${w},${y}`,
      area: `M0,${y} L${w},${y} L${w},${h} L0,${h} Z`,
    }
  }

  const xs = points.map((_, i) => (i / (n - 1)) * w)
  const ys = points.map((p) => h - pad - (p.revenue / maxV) * (h - 2 * pad))

  let line = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < n; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2
    line += ` C${cpx},${ys[i - 1]} ${cpx},${ys[i]} ${xs[i]},${ys[i]}`
  }
  const area = `${line} L${xs[n - 1]},${h} L${xs[0]},${h} Z`
  return { line, area }
}

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG = {
  job_control:  { label: 'Job Control',   bg: '#f1f5f9', color: '#64748b' },
  working:      { label: 'Working',       bg: '#fef9c3', color: '#854d0e' },
  ready_for_fi: { label: 'Ready for FI',  bg: '#ffedd5', color: '#9a3412' },
  completed:    { label: 'Job Completed', bg: '#dcfce7', color: '#166534' },
  invoiced:     { label: 'Invoice',       bg: '#ede9fe', color: '#6b21a8' },
  delivered:    { label: 'Delivered',     bg: '#dcfce7', color: '#166534' },
  cancelled:    { label: 'Cancelled',     bg: '#ffe4e6', color: '#be123c' },
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-slate-100 dark:bg-slate-800 ${className}`} />
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { theme } = useTenantBranding()

  const [summary, setSummary]   = useState(null)
  const [trend, setTrend]       = useState([])
  const [funnel, setFunnel]     = useState([])
  const [recent, setRecent]     = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [s, t, f, r] = await Promise.all([
          fetchDashboardSummary(),
          fetchRevenueTrend(6),
          fetchJobCardFunnel(),
          fetchRecentActivity(10),
        ])
        if (cancelled) return
        setSummary(s)
        setTrend(Array.isArray(t) ? t : [])
        setFunnel(Array.isArray(f) ? f : [])
        setRecent(Array.isArray(r) ? r : [])
      } catch (e) {
        if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
        // Non-fatal: dashboard degrades gracefully with empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  // ── Derived values ──────────────────────────────────────────────────────────
  const funnelMap    = Object.fromEntries(funnel.map((f) => [f.status, f.count]))
  const activeJobs   = summary?.active_jobs ?? 0
  const working      = funnelMap.working ?? 0
  const jobControl   = funnelMap.job_control ?? 0
  const readyForFi   = funnelMap.ready_for_fi ?? 0

  const { line, area } = buildSvgPath(trend)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminShell activeNav="dashboard">
        <div className="mx-auto max-w-[1180px] space-y-6">

          {/* ── Page header ── */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Here&apos;s what&apos;s happening today.</p>
          </div>

          {/* ── KPI cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Customers',      value: fmtCount(summary?.total_customers),      Icon: Users          },
              { label: 'Active Job Cards',     value: fmtCount(summary?.active_jobs),          Icon: WalletCards    },
              { label: 'Revenue This Month',   value: fmtMoney(summary?.revenue_this_month),   Icon: CircleDollarSign },
              { label: 'Completed This Month', value: fmtCount(summary?.completed_this_month), Icon: BadgeCheck     },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                {loading
                  ? <Skeleton className="mt-2 h-10 w-24" />
                  : <p className="mt-1 text-4xl font-bold text-slate-900 dark:text-white">{value}</p>
                }
              </div>
            ))}
          </div>

          {/* ── Revenue chart + Job status ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

            {/* Revenue chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 xl:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Revenue Overview</h3>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Monthly Performance</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
                  Last 6 Months
                </span>
              </div>

              {loading ? (
                <div className="flex h-[230px] items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                </div>
              ) : trend.length === 0 ? (
                <div className="flex h-[230px] items-center justify-center">
                  <p className="text-sm text-slate-400">No revenue data available yet.</p>
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 760 230" className="h-[230px] w-full">
                    <defs>
                      <linearGradient id="revGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={hexToRgba(theme.accent, 0.28)} />
                        <stop offset="100%" stopColor={hexToRgba(theme.accent, 0.03)} />
                      </linearGradient>
                    </defs>
                    <path d={line} fill="none" stroke={theme.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={area} fill="url(#revGradient)" />
                  </svg>
                  <div className="mt-5 flex justify-between text-xs font-bold tracking-wider text-slate-400">
                    {trend.map((t) => (
                      <span key={t.month}>{monthLabel(t.month)}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Job status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <h3 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Job Status</h3>
              <div
                className="mx-auto mb-6 flex h-44 w-44 items-center justify-center rounded-full border-[14px]"
                style={{ borderColor: theme.accent }}
              >
                <div className="text-center">
                  {loading ? (
                    <Skeleton className="mx-auto h-12 w-12" />
                  ) : (
                    <>
                      <p className="text-5xl font-bold text-slate-900 dark:text-white">{activeJobs}</p>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Active</p>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ['Working',      working],
                  ['Job Control',  jobControl],
                  ['Ready for FI', readyForFi],
                ].map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{label}</span>
                    {loading
                      ? <Skeleton className="h-4 w-8" />
                      : <span className="font-bold text-slate-900 dark:text-white">{count}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent job cards */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800/60">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Job Cards</h3>
              <Link
                to="/admin/job-cards"
                className="text-sm font-semibold hover:opacity-80"
                style={{ color: theme.accent }}
              >
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Job ID</th>
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                        No job cards found.
                      </td>
                    </tr>
                  ) : (
                    recent.map((row) => {
                      const cfg = STATUS_CONFIG[row.status] ?? { label: row.status, bg: '#f1f5f9', color: '#64748b' }
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{row.jobcard_number}</td>
                          <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{row.vehicle_registration ?? '—'}</td>
                          <td className="px-6 py-4">
                            <span
                              className="rounded-full px-3 py-1 text-[10px] font-bold"
                              style={{ backgroundColor: cfg.bg, color: cfg.color }}
                            >
                              {cfg.label.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{fmtMoney(row.total_amount)}</td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              to={`/admin/job-cards/${row.id}`}
                              className="text-xs font-semibold hover:underline"
                              style={{ color: theme.accent }}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </AdminShell>
    </>
  )
}
