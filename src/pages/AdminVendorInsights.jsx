import { useEffect, useState } from 'react'
import { AlertCircle, Building2, FileStack, Wallet } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { hexToRgba } from '../utils/themeColors'
import { fetchVendorInsights } from '../utils/vendors'

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

// ── SVG trend chart (mirrors AdminInsights.jsx's revenue chart) ─────────────
function buildSvgPath(points, w = 760, h = 180, pad = 20) {
  if (!points.length) return { line: '', area: '' }
  const maxV = Math.max(...points.map((p) => p.total), 1)
  const n = points.length
  if (n === 1) {
    const y = h - pad - (points[0].total / maxV) * (h - 2 * pad)
    return { line: `M0,${y} L${w},${y}`, area: `M0,${y} L${w},${y} L${w},${h} L0,${h} Z` }
  }
  const xs = points.map((_, i) => (i / (n - 1)) * w)
  const ys = points.map((p) => h - pad - (p.total / maxV) * (h - 2 * pad))
  let line = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < n; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2
    line += ` C${cpx},${ys[i - 1]} ${cpx},${ys[i]} ${xs[i]},${ys[i]}`
  }
  return { line, area: `${line} L${xs[n - 1]},${h} L${xs[0]},${h} Z` }
}

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`} />
}

const PAYMENT_CONFIG = {
  paid: { label: 'Paid', color: '#16a34a', bg: 'bg-emerald-500' },
  partial: { label: 'Partial', color: '#d97706', bg: 'bg-amber-500' },
  unpaid: { label: 'Unpaid', color: '#dc2626', bg: 'bg-rose-500' },
}

export default function AdminVendorInsights() {
  const { theme } = useTenantBranding()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchVendorInsights({ months: 6, limit: 8 })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => {
        if (cancelled) return
        if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin' }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const summary = data?.summary
  const trend = data?.monthly_trend || []
  const paymentBreakdown = data?.payment_status_breakdown || []
  const topVendors = data?.top_vendors || []
  const categories = data?.category_breakdown || []

  const { line, area } = buildSvgPath(trend)
  const totalBreakdown = paymentBreakdown.reduce((a, p) => a + (p.total || 0), 0) || 1
  const maxVendorOutstanding = Math.max(...topVendors.map((v) => v.outstanding), 1)
  const maxCategoryTotal = Math.max(...categories.map((c) => c.total), 1)

  return (
    <AdminShell activeNav="vendor">
      <div className="mx-auto max-w-[1180px] space-y-6">

        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Vendor Insights</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Accounts payable analytics — outstanding balances, spend trend, and top vendors.</p>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Outstanding', value: fmtMoney(summary?.total_outstanding), icon: Wallet },
            { label: 'Active Vendors', value: fmtCount(summary?.total_vendors), icon: Building2 },
            { label: 'Bills Issued', value: fmtCount(summary?.total_bills_issued), icon: FileStack },
            { label: 'Overdue Bills', value: `${fmtCount(summary?.overdue_count)} · ${fmtMoney(summary?.overdue_amount)}`, icon: AlertCircle },
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

        {/* ── Spend trend ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Spend Trend</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Last 6 Months · By Bill Date</p>
            </div>
            {trend.length > 0 && !loading && (
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Total:{' '}
                <span className="text-slate-900 dark:text-white">
                  {fmtMoney(trend.reduce((a, t) => a + (t.total || 0), 0))}
                </span>
              </p>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : trend.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-sm text-slate-400">No vendor bills recorded yet.</p>
            </div>
          ) : (
            <>
              <svg viewBox="0 0 760 180" className="h-[180px] w-full">
                <defs>
                  <linearGradient id="vendorInsightGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={hexToRgba(theme.accent, 0.25)} />
                    <stop offset="100%" stopColor={hexToRgba(theme.accent, 0.02)} />
                  </linearGradient>
                </defs>
                <path d={line} fill="none" stroke={theme.accent} strokeWidth="3.5" strokeLinecap="round" />
                <path d={area} fill="url(#vendorInsightGradient)" />
              </svg>
              <div className="mt-3 flex justify-between text-[11px] font-bold tracking-wider text-slate-400">
                {trend.map((t) => (
                  <span key={t.month}>{monthLabel(t.month)}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Payment health + Spend by category ── */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <h3 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">Payment Health</h3>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : paymentBreakdown.every((p) => !p.count) ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-slate-400">No vendor bills yet.</p>
              </div>
            ) : (
              <>
                <div className="mb-5 flex h-4 w-full overflow-hidden rounded-full">
                  {paymentBreakdown.map((p) => {
                    const cfg = PAYMENT_CONFIG[p.status] || { bg: 'bg-slate-300' }
                    const pct = (p.total / totalBreakdown) * 100
                    return <div key={p.status} className={`${cfg.bg} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  })}
                </div>
                <div className="space-y-3">
                  {paymentBreakdown.map((p) => {
                    const cfg = PAYMENT_CONFIG[p.status] || { label: p.status, color: '#64748b' }
                    const pct = Math.round((p.total / totalBreakdown) * 100)
                    return (
                      <div key={p.status} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cfg.color }} />
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{cfg.label}</p>
                            <p className="text-xs text-slate-400">{fmtCount(p.count)} bills · {pct}%</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(p.total)}</p>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <h3 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">Spend by Category</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : categories.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-slate-400">No vendor bills yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((c) => {
                  const barPct = Math.round((c.total / maxCategoryTotal) * 100)
                  return (
                    <div key={c.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{c.category}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{fmtMoney(c.total)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: theme.accent }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Top vendors by outstanding ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <h3 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">Top Vendors by Outstanding Balance</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : topVendors.length === 0 ? (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-slate-400">No outstanding balances — everything's settled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topVendors.map((v, idx) => {
                const barPct = Math.round((v.outstanding / maxVendorOutstanding) * 100)
                return (
                  <div key={v.vendor_id} className="flex items-center gap-4">
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-slate-400">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{v.vendor_name}</p>
                        <span className="font-bold text-slate-900 dark:text-white">{fmtMoney(v.outstanding)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: theme.accent }} />
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
