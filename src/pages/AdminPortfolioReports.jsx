import { Link } from 'react-router-dom'
import { ChevronRight, TrendingUp } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'

// Each entry is a self-contained report page. Add new reports here as they're built.
const REPORTS = [
  {
    key: 'vehicle-sales',
    to: '/admin/portfolio/reports/sales',
    icon: TrendingUp,
    title: 'Vehicle Sales Report',
    description: 'Every confirmed and cancelled sale — buyer, sale amount, discount, and profit (owned margin or consignment commission) — filter by date range and inventory type, export to CSV.',
  },
]

export default function AdminPortfolioReports() {
  const { theme } = useTenantBranding()

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Generate and download reports across your portfolio's data.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORTS.map((report) => (
            <Link
              key={report.key}
              to={report.to}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
              >
                <report.icon size={20} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">{report.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{report.description}</p>
              </div>
              <ChevronRight size={18} className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
