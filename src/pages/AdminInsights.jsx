import { useEffect, useState } from 'react'
import {
  BadgeCheck, Car, CircleDollarSign, TrendingUp,
  Users, WalletCards, AlertCircle, Wrench,
} from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { hexToRgba } from '../utils/themeColors'
import {
  fetchDashboardSummary,
  fetchRevenueTrend,
  fetchJobCardFunnel,
  fetchPaymentDistribution,
  fetchTopServices,
} from '../utils/dashboard'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtCount(n) {
  return n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN')
}

function monthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short' }).toUpperCase()
}

// ── SVG revenue chart ─────────────────────────────────────────────────────────

function buildSvgPath(points, w = 760, h = 180, pad = 20) {
  if (!points.length) return { line: '', area: '' }
  const maxV = Math.max(...points.map((p) => p.revenue), 1)
  const n = points.length
  if (n === 1) {
    const y = h - pad - (points[0].revenue / maxV) * (h - 2 * pad)
    return { line: `M0,${y} L${w},${y}`, area: `M0,${y} L${w},${y} L${w},${h} L0,${h} Z` }
  }
  const xs = points.map((_, i) => (i / (n - 1)) * w)
  const ys = points.map((p) => h - pad - (p.revenue / maxV) * (h - 2 * pad))
  let line = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < n; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2
    line += ` C${cpx},${ys[i - 1]} ${cpx},${ys[i]} ${xs[i]},${ys[i]}`
  }
  return { line, area: `${line} L${xs[n - 1]},${h} L${xs[0]},${h} Z` }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`} />
}

// ── Job status config ─────────────────────────────────────────────────────────

const FUNNEL_CONFIG = [
  { key: 'job_control',  label: 'Job Control',   color: '#64748b' },
  { key: 'working',      label: 'Working',        color: '#d97706' },
  { key: 'ready_for_fi', label: 'Ready for FI',   color: '#ea580c' },
  { key: 'completed',    label: 'Completed',      color: '#16a34a' },
  { key: 'invoiced',     label: 'Invoiced',       color: '#7c3aed' },
  { key: 'delivered',    label: 'Delivered',      color: '#0d9488' },
  { key: 'cancelled',    label: 'Cancelled',      color: '#be123c' },
]

const PAYMENT_CONFIG = {
  paid:    { label: 'Paid',         color: '#16a34a', bg: 'bg-emerald-500' },
  partial: { label: 'Partial',      color: '#d97706', bg: 'bg-amber-500' },
  unpaid:  { label: 'Unpaid',       color: '#dc2626', bg: 'bg-rose-500' },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminInsights() {
  const { theme } = useTenantBranding()

  const [summary, setSummary]   = useState(null)
  const [trend, setTrend]       = useState([])
  const [funnel, setFunnel]     = useState([])
  const [payments, setPayments] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [s, t, f, p, sv] = await Promise.all([
          fetchDashboardSummary(),
          fetchRevenueTrend(6),
          fetchJobCardFunnel(),
          fetchPaymentDistribution(),
          fetchTopServices(6, 3),
        ])
        if (cancelled) return
        setSummary(s)
        setTrend(Array.isArray(t) ? t : [])
        setFunnel(Array.isArray(f) ? f : [])
        setPayments(Array.isArray(p) ? p : [])
        setServices(Array.isArray(sv) ? sv : [])
      } catch (e) {
        if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const funnelMap     = Object.fromEntries(funnel.map((f) => [f.status, f.count]))
  const totalFunnel   = funnel.reduce((a, f) => a + (f.count || 0), 0) || 1
  const { line, area } = buildSvgPath(trend)
  const maxRevenue    = Math.max(...services.map((s) => s.revenue), 1)
  const totalPaid     = payments.reduce((a, p) => a + (p.total_amount || 0), 0) || 1

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1180px] space-y-6">

        {/* ── Page header ── */}
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Insights</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Analytics and performance overview.</p>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Customers',     value: fmtCount(summary?.total_customers),      icon: Users,            delta: null },
            { label: 'Total Vehicles',       value: fmtCount(summary?.total_vehicles),       icon: Car,              delta: null },
            { label: 'Revenue This Month',   value: fmtMoney(summary?.revenue_this_month),   icon: CircleDollarSign, delta: null },
            { label: 'Outstanding Amount',   value: fmtMoney(summary?.outstanding_amount),   icon: AlertCircle,      delta: null },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-3 flex items-center justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
                >
                  <Icon size={19} strokeWidth={2.2} />
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              {loading
                ? <Skeleton className="mt-2 h-8 w-28" />
                : <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
              }
            </div>
          ))}
        </div>

        {/* ── Job card stats row ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Jobs',          value: fmtCount(summary?.active_jobs),          icon: WalletCards },
            { label: 'Completed This Month', value: fmtCount(summary?.completed_this_month), icon: BadgeCheck },
            { label: 'Total Jobs',           value: fmtCount(summary?.total_jobs),           icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
              >
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                {loading
                  ? <Skeleton className="mt-1 h-6 w-16" />
                  : <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                }
              </div>
            </div>
          ))}
        </div>

        {/* ── Revenue chart ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Last 6 Months</p>
            </div>
            {trend.length > 0 && !loading && (
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Total:{' '}
                <span className="text-slate-900 dark:text-white">
                  {fmtMoney(trend.reduce((a, t) => a + (t.revenue || 0), 0))}
                </span>
              </p>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : trend.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-sm text-slate-400">No revenue data available yet.</p>
            </div>
          ) : (
            <>
              <svg viewBox="0 0 760 180" className="h-[180px] w-full">
                <defs>
                  <linearGradient id="insightGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={hexToRgba(theme.accent, 0.25)} />
                    <stop offset="100%" stopColor={hexToRgba(theme.accent, 0.02)} />
                  </linearGradient>
                </defs>
                <path d={line} fill="none" stroke={theme.accent} strokeWidth="3.5" strokeLinecap="round" />
                <path d={area} fill="url(#insightGradient)" />
              </svg>
              <div className="mt-3 flex justify-between text-[11px] font-bold tracking-wider text-slate-400">
                {trend.map((t) => (
                  <span key={t.month}>{monthLabel(t.month)}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Job funnel + Payment health ── */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          {/* Job card funnel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <h3 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">Job Card Pipeline</h3>
            <div className="space-y-3">
              {FUNNEL_CONFIG.map(({ key, label, color }) => {
                const count = funnelMap[key] || 0
                const pct   = Math.round((count / totalFunnel) * 100)
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                      {loading
                        ? <Skeleton className="h-4 w-10" />
                        : <span className="font-bold text-slate-900 dark:text-white">{fmtCount(count)}</span>
                      }
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      {!loading && (
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payment health */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <h3 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">Payment Health</h3>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : payments.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-slate-400">No invoice data yet.</p>
              </div>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="mb-5 flex h-4 w-full overflow-hidden rounded-full">
                  {payments.map((p) => {
                    const cfg = PAYMENT_CONFIG[p.status] || { bg: 'bg-slate-300' }
                    const pct = (p.total_amount / totalPaid) * 100
                    return (
                      <div
                        key={p.status}
                        className={`${cfg.bg} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    )
                  })}
                </div>

                <div className="space-y-3">
                  {payments.map((p) => {
                    const cfg = PAYMENT_CONFIG[p.status] || { label: p.status, color: '#64748b' }
                    const pct = Math.round((p.total_amount / totalPaid) * 100)
                    return (
                      <div key={p.status} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{cfg.label}</p>
                            <p className="text-xs text-slate-400">{fmtCount(p.count)} invoices · {pct}%</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(p.total_amount)}</p>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Top services ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Top Services</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Last 3 Months · By Revenue</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
              <Wrench size={13} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Billed Work</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-slate-400">No service data yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((s, idx) => {
                const barPct = Math.round((s.revenue / maxRevenue) * 100)
                return (
                  <div key={s.description} className="flex items-center gap-4">
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-slate-400">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{s.description}</p>
                        <div className="ml-4 flex shrink-0 items-center gap-3 text-xs">
                          <span className="text-slate-400">{fmtCount(s.count)}×</span>
                          <span className="font-bold text-slate-900 dark:text-white">{fmtMoney(s.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%`, backgroundColor: theme.accent }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </AdminShell>
  )
}
