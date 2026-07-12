import { Briefcase } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'

export default function AdminPortfolio() {
  const { theme } = useTenantBranding()

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Portfolio</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Inventory vehicles and portfolio insights</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-24">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${theme.accent}18` }}
        >
          <Briefcase size={28} style={{ color: theme.accent }} />
        </div>
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Portfolio</h2>
        <p className="mt-2 text-sm text-slate-400">This module is coming soon.</p>
      </div>
    </AdminShell>
  )
}
