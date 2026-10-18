import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchPortfolioProfitabilityInsights } from '../utils/dealerProfitability'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function fmtPercent(n) {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toFixed(1)}%`
}

function PerformerRow({ p }) {
  const isLoss = Number(p.profit) < 0
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.vehicle_label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
          {p.inventory_type === 'customer_consignment' ? 'Consignment' : 'Owned'} · Sold {fmtMoney(p.final_sale_price)}
        </p>
      </div>
      <p className={`shrink-0 text-sm font-bold ${isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
        {isLoss ? '−' : ''}{fmtMoney(Math.abs(p.profit))}
        {p.margin_percent !== null && p.margin_percent !== undefined ? (
          <span className="ml-1 font-medium text-slate-400">({fmtPercent(p.margin_percent)})</span>
        ) : null}
      </p>
    </div>
  )
}

export default function PortfolioInsights() {
  const { theme } = useTenantBranding()
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPortfolioProfitabilityInsights()
      .then((data) => { if (!cancelled) setInsights(data) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load insights.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (error) return null // non-critical — don't block the inventory list over an insights failure

  const cards = [
    { label: 'Combined Profit', value: fmtMoney(insights?.combined_total_profit), Icon: Wallet },
    { label: 'Owned Gross Profit', value: fmtMoney(insights?.owned?.total_gross_profit), sub: `${insights?.owned?.count ?? 0} sold`, Icon: TrendingUp },
    { label: 'Owned Avg Margin', value: fmtPercent(insights?.owned?.average_gross_margin_percent), Icon: TrendingUp },
    { label: 'Consignment Profit', value: fmtMoney(insights?.consignment?.total_net_dealer_profit), sub: `${insights?.consignment?.count ?? 0} sold`, Icon: TrendingDown },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
      >
        <div className="text-left">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Profitability Insights</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {loading ? 'Loading…' : `Based on ${insights?.sold_vehicle_count ?? 0} confirmed sale${insights?.sold_vehicle_count === 1 ? '' : 's'}`}
          </p>
        </div>
        {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 p-5 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map(({ label, value, sub, Icon }) => (
              <div key={label} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-1 break-words text-xl font-bold text-slate-900 dark:text-white">{loading ? '—' : value}</p>
                {sub ? <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p> : null}
              </div>
            ))}
          </div>

          {!loading && insights?.sold_vehicle_count > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Top Performers</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {insights.top_performers.map((p) => <PerformerRow key={p.vehicle_id} p={p} />)}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Lowest Performers</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {insights.lowest_performers.map((p) => <PerformerRow key={p.vehicle_id} p={p} />)}
                </div>
              </div>
            </div>
          ) : null}

          {!loading && insights?.sold_vehicle_count === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No confirmed sales yet — profitability will appear here once vehicles start selling.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
