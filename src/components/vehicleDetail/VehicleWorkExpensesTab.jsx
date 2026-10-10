import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { createWorkExpense, deleteWorkExpense, fetchWorkExpenses, updateWorkExpense } from '../../utils/dealerWorkExpenses'
import WorkExpenseModal from './WorkExpenseModal'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES = {
  planned: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

export default function VehicleWorkExpensesTab({ vehicle }) {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const [data, setData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null) // null | 'new' | expense object

  const load = (p = page) => {
    setLoading(true)
    fetchWorkExpenses(vehicle.id, { page: p })
      .then((res) => { setData(res); setPage(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [vehicle.id])

  const rows = data.results || []
  const total = rows.reduce((sum, r) => (r.status !== 'cancelled' ? sum + Number(r.amount || 0) : sum), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total (this page, excl. cancelled): <span className="font-bold text-slate-900 dark:text-white">{fmtMoney(total)}</span>
        </p>
        <button type="button" onClick={() => setModalState('new')} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
          <Plus size={14} /> Add Expense
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-slate-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-slate-500">No work expenses recorded yet.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-semibold capitalize text-slate-900 dark:text-white">{r.category.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(r.amount)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{fmtDate(r.expense_date)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{r.provider_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[r.status] || STATUS_STYLES.planned}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1 text-slate-500 dark:text-slate-400">
                        <button type="button" title="Edit" onClick={() => setModalState(r)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={15} /></button>
                        <button
                          type="button"
                          title="Archive"
                          onClick={async () => {
                            if (!globalThis.confirm('Archive this work expense?')) return
                            await deleteWorkExpense(vehicle.id, r.id)
                            showToast('success', 'Work expense archived.')
                            load()
                          }}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800/60">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Showing {rows.length} of {data.count} entries</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!data.previous} onClick={() => load(Math.max(page - 1, 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400">Prev</button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: theme.accent }}>{page}</span>
            <button type="button" disabled={!data.next} onClick={() => load(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400">Next</button>
          </div>
        </div>
      </div>

      {modalState ? (
        <WorkExpenseModal
          expense={modalState === 'new' ? null : modalState}
          onClose={() => setModalState(null)}
          onSubmit={async (payload) => {
            if (modalState === 'new') {
              await createWorkExpense(vehicle.id, payload)
              showToast('success', 'Work expense added.')
            } else {
              await updateWorkExpense(vehicle.id, modalState.id, payload)
              showToast('success', 'Work expense updated.')
            }
            load()
          }}
        />
      ) : null}
    </div>
  )
}
