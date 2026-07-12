import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import {
  deleteServiceVehicle,
  fetchServiceVehicles,
} from '../utils/vehicles'

export default function AdminServiceVehicles() {
  const { theme } = useTenantBranding()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [listData, setListData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [viewRow, setViewRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadList = useCallback(
    async (p = 1) => {
      setLoading(true)
      setListError('')
      try {
        const data = await fetchServiceVehicles({ page: p, pageSize: 10, isArchived: showArchived })
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
    },
    [showArchived],
  )

  useEffect(() => {
    loadList(1)
  }, [loadList, showArchived])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = listData.results || []
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.registration_no?.toLowerCase().includes(q) ||
        r.customer_name?.toLowerCase().includes(q) ||
        r.brand_name?.toLowerCase().includes(q) ||
        r.vehicle_model_name?.toLowerCase().includes(q),
    )
  }, [listData.results, search])

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteServiceVehicle(deleteTarget.id)
      showToast('success', 'Vehicle archived.')
      setDeleteTarget(null)
      await loadList(page)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Archive failed.')
    }
  }

  return (
    <>
      <AdminShell activeNav="service-vehicles">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Service Vehicles</h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">Register and manage customer vehicles linked to brands and models.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/service-vehicles/new')}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow"
              style={{ backgroundColor: theme.accent }}
            >
              <Plus size={18} /> Add vehicle
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[280px] flex-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search registration, customer, brand..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Show archived
              </label>
            </div>
          </div>

          {listError ? (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">
              {listError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Registration</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Brand / Model</th>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4">Fuel</th>
                    <th className="w-44 px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-slate-500 dark:text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-slate-500 dark:text-slate-400">
                        No vehicles found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-3 font-mono text-xs font-bold text-slate-900 dark:text-white">{r.registration_no}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{r.customer_name || '—'}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                          {r.brand_name || '—'} · {r.vehicle_model_name || '—'}
                        </td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{r.year}</td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{r.fuel_type_name || '—'}</td>
                        <td className="px-6 py-3">
                          <div className="flex justify-center gap-1 text-slate-500 dark:text-slate-400">
                            <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="View" onClick={() => setViewRow(r)}>
                              <Eye size={16} />
                            </button>
                            {!showArchived ? (
                              <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit" onClick={() => navigate(`/admin/service-vehicles/${r.id}/edit`)}>
                                <Pencil size={16} />
                              </button>
                            ) : null}
                            {!showArchived ? (
                              <button type="button" className="rounded-lg p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600" title="Archive" onClick={() => setDeleteTarget(r)}>
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
              <p>Showing {filteredRows.length} of {listData.count} vehicles</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!listData.previous}
                  onClick={() => loadList(page - 1)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{page}</span>
                <button
                  type="button"
                  disabled={!listData.next}
                  onClick={() => loadList(page + 1)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminShell>

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewRow.registration_no}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{viewRow.customer_name}</p>
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewRow(null)}>
                <X size={18} />
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ['Brand', viewRow.brand_name],
                ['Model', viewRow.vehicle_model_name],
                ['Year', viewRow.year],
                ['Type', viewRow.vehicle_type_name],
                ['Fuel', viewRow.fuel_type_name],
                ['VIN', viewRow.vin_number || '—'],
                ['Engine No.', viewRow.engine_number || '—'],
                ['Engine cc', viewRow.engine_cc ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={() => setViewRow(null)}>
                Close
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: theme.accent }}
                onClick={() => { setViewRow(null); navigate(`/admin/service-vehicles/${viewRow.id}/edit`) }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive vehicle</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Archive <span className="font-mono font-semibold">{deleteTarget.registration_no}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDelete}>
                Archive
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
