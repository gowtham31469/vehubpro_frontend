import AdminShell from '../components/AdminShell'
import PortfolioInsights from '../components/PortfolioInsights'

export default function AdminPortfolio() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-[1180px] space-y-5">
        <div className="mb-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Insights</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Profitability across your inventory vehicles.</p>
        </div>

        <PortfolioInsights />
      </div>
    </AdminShell>
  )
}
