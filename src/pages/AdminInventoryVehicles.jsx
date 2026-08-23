import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { deleteInventoryVehicle, fetchInventoryVehicles } from '../utils/inventoryVehicles'

const STATUS_STYLES = {
  available: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  booked: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  sold: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function AdminInventoryVehicles() {
  const { theme } = useTenantBranding()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [listData, setListData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadList = useCallback(
    async (p = 1) => {
      setLoading(true)
      setListError('')
      try {
        const data = await fetchInventoryVehicles({ page: p, pageSize: 10, isArchived: showArchived })
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
        r.vehicle_model_name?.toLowerCase().includes(q) ||
        r.brand_name?.toLowerCase().includes(q) ||
        r.registration_no?.toLowerCase().includes(q),
    )
  }, [listData.results, search])

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteInventoryVehicle(deleteTarget.id)
      showToast('success', 'Listing archived.')
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
      <AdminShell activeNav="inventory_vehicles">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Inventory Vehicles</h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">Manage vehicles listed for sale in your tenant portfolio.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/portfolio/inventory/new')}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow"
              style={{ backgroundColor: theme.accent }}
            >
              <Plus size={18} /> Add New Listing
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[280px] flex-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search model, brand, registration..."
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
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4">Fuel / Transmission</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="w-32 px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-slate-500 dark:text-slate-400">Loading…</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-slate-500 dark:text-slate-400">No inventory vehicles found.</td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const thumb = r.photo_urls?.[0]?.url
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                                {thumb ? (
                                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <Car size={18} className="text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{r.brand_name} {r.vehicle_model_name}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{r.registration_no || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{r.year}</td>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                            {r.fuel_type_name || '—'} · {r.transmission === 'manual' ? 'Manual' : 'Automatic'}
                          </td>
                          <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white">{fmtMoney(r.listing_price)}</td>
                          <td className="px-6 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[r.status] || STATUS_STYLES.available}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex justify-center gap-1 text-slate-500 dark:text-slate-400">
                              {!showArchived ? (
                                <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit" onClick={() => navigate(`/admin/portfolio/inventory/${r.id}/edit`)}>
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
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
              <p>Showing {filteredRows.length} of {listData.count} listings</p>
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

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive Listing</h3>
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Archive <span className="font-semibold text-slate-900 dark:text-white">{deleteTarget.brand_name} {deleteTarget.vehicle_model_name}</span>?
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
