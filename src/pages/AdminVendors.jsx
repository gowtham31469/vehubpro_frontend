import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Pencil, RotateCcw, Search, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { archiveVendor, fetchVendorCategories, fetchVendors, reactivateVendor } from '../utils/vendors'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Archive confirmation modal ───────────────────────────────────────────────
function ArchiveVendorModal({ vendor, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [archiving, setArchiving] = useState(false)

  const handleConfirm = async () => {
    setArchiving(true)
    try {
      await archiveVendor(vendor.id)
      showToast('success', 'Vendor archived.')
      onSuccess()
      onClose()
    } catch (err) {
      showToast('error', err.message || 'Failed to archive vendor.')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive Vendor</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Archive <span className="font-semibold text-slate-800 dark:text-slate-200">{vendor.name}</span>? It will be hidden from the active vendor list and new bills can't be created against it — existing bills and payments are kept, and you can reactivate it anytime.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={archiving} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400">
            Keep Vendor
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={archiving}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {archiving ? 'Archiving…' : 'Archive Vendor'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminVendors() {
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [listData, setListData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetchVendorCategories({ isActive: true })
      .then((rows) => setCategories(rows.map((c) => ({ id: c.name, name: c.name }))))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedSearch(search), 300)
    return () => globalThis.clearTimeout(t)
  }, [search])

  const loadList = useCallback(async (p = 1) => {
    setLoading(true)
    setListError('')
    try {
      const data = await fetchVendors({ page: p, pageSize: 10, search: debouncedSearch, category, archived: showArchived })
      setListData(data)
      setPage(p)
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setListError(e.message)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, showArchived])

  useEffect(() => { loadList(1) }, [debouncedSearch, category, showArchived, loadList])

  const handleReactivate = async (vendor) => {
    try {
      await reactivateVendor(vendor.id)
      showToast('success', 'Vendor reactivated.')
      void loadList(page)
    } catch (err) {
      showToast('error', err.message || 'Failed to reactivate vendor.')
    }
  }

  const results = listData.results || []
  const totalCount = listData.count || 0

  return (
    <AdminShell activeNav="vendor">
      <div className="mx-auto max-w-[1300px] space-y-5">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Vendor List</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Your vendor/supplier master — bills and payments reference these.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/vendors/new')}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
            style={{ backgroundColor: theme.accent }}
          >
            + Add Vendor
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor name, GSTIN, or phone…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
            />
          </div>
          <div className="w-48">
            <SearchableSelect
              value={category}
              options={categories}
              onChange={setCategory}
              placeholder="All Categories"
              accent={theme.accent}
              accentSoft={theme.accentSoft}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} style={{ accentColor: theme.accent }} />
            Show archived
          </label>
        </div>

        {listError ? (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-800 dark:text-rose-400">{listError}</div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">GSTIN</th>
                  <th className="px-5 py-4 text-right">Outstanding</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">Loading…</td></tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <p className="font-medium text-slate-600 dark:text-slate-400">No vendors found.</p>
                      <p className="mt-1 text-xs text-slate-400">Click "+ Add Vendor" to get started.</p>
                    </td>
                  </tr>
                ) : results.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/vendor-bills?vendor_id=${v.id}`)}
                        className="font-semibold hover:underline"
                        style={{ color: theme.accent }}
                        title="View this vendor's bills"
                      >
                        {v.name}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{v.category || '—'}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                      {v.contact_person || '—'}{v.phone ? ` · ${v.phone}` : ''}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{v.gstin || '—'}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      {Number(v.outstanding_balance) > 0 ? fmtMoney(v.outstanding_balance) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${v.is_archived ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                        {v.is_archived ? 'Archived' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" title="Edit" className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => navigate(`/admin/vendors/${v.id}/edit`)}>
                          <Pencil size={16} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          title={v.is_archived ? 'Reactivate' : 'Archive'}
                          className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => (v.is_archived ? handleReactivate(v) : setArchiveTarget(v))}
                        >
                          {v.is_archived ? <RotateCcw size={16} strokeWidth={2} /> : <Archive size={16} strokeWidth={2} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
            <p>Showing {results.length} of {totalCount} vendors</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={!listData.previous} onClick={() => loadList(page - 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Prev</button>
              <span className="rounded-lg px-3 py-1.5 text-white" style={{ backgroundColor: theme.accent }}>{page}</span>
              <button type="button" disabled={!listData.next} onClick={() => loadList(page + 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

      </div>

      {archiveTarget ? (
        <ArchiveVendorModal
          vendor={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onSuccess={() => { void loadList(page) }}
        />
      ) : null}
    </AdminShell>
  )
}
