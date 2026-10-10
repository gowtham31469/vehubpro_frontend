import { useEffect, useRef, useState } from 'react'
import { Calendar, Check, ChevronDown, Search, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchVisitRequestEvents, fetchVisitRequests, updateVisitRequest } from '../utils/visitRequests'

const TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function statusBadgeStyle(status) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
    case 'contacted':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
  }
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || status
}

function statusDotColor(status) {
  switch (status) {
    case 'pending': return 'bg-amber-500'
    case 'contacted': return 'bg-sky-500'
    case 'completed': return 'bg-emerald-500'
    case 'cancelled': return 'bg-rose-500'
    default: return 'bg-slate-400'
  }
}

function fmtDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtTime(value) {
  if (!value) return ''
  return new Date(`1970-01-01T${value}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export default function AdminVisitRequests() {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [tab, setTab] = useState('')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [data, setData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [editingRequest, setEditingRequest] = useState(null)
  const [editStatus, setEditStatus] = useState('pending')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const statusDropdownRef = useRef(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  useEffect(() => {
    if (!statusDropdownOpen) return
    function handleClickOutside(e) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) setStatusDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [statusDropdownOpen])

  const load = async (targetPage = page, targetTab = tab, targetSearch = debouncedSearchText) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const result = await fetchVisitRequests({ page: targetPage, status: targetTab, search: targetSearch })
      setData(result)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setErrorMessage(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedSearchText(searchText), 300)
    return () => globalThis.clearTimeout(t)
  }, [searchText])

  useEffect(() => {
    setPage(1)
    load(1, tab, debouncedSearchText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedSearchText])

  const rows = data.results || []

  const openEdit = (row) => {
    setEditingRequest(row)
    setEditStatus(row.status)
    setEditNotes(row.staff_notes || '')
    setStatusDropdownOpen(false)
    setEvents([])
    setEventsLoading(true)
    fetchVisitRequestEvents(row.id)
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }

  const handleSave = async () => {
    if (!editingRequest) return
    setSaving(true)
    try {
      await updateVisitRequest(editingRequest.id, { status: editStatus, staff_notes: editNotes })
      showToast('success', 'Visit request updated.')
      setEditingRequest(null)
      await load(page, tab)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Could not update visit request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminShell>
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Visit Requests</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Showroom visit requests booked by customers from the public site.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id || 'all'}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === t.id
                      ? 'text-white shadow'
                      : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                  style={tab === t.id ? { backgroundColor: theme.accent } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative w-full min-w-[220px] sm:w-72">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name, phone, vehicle..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{errorMessage}</div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Preferred Date</th>
                    <th className="px-6 py-4">Message</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr><td className="px-6 py-8 text-slate-500" colSpan={6}>Loading visit requests...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td className="px-6 py-8 text-slate-500" colSpan={6}>No visit requests found.</td></tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          {row.vehicle_year} {row.vehicle_brand_name} {row.vehicle_model_name}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{row.phone}{row.email ? ` · ${row.email}` : ''}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5"><Calendar size={13} />{fmtDate(row.preferred_date)}{row.preferred_time ? ` · ${fmtTime(row.preferred_time)}` : ''}</span>
                        </td>
                        <td className="max-w-[220px] truncate px-6 py-4 text-slate-500 dark:text-slate-400" title={row.message || ''}>
                          {row.message || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:opacity-90"
                            style={{ backgroundColor: theme.accent }}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800/60">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Showing {rows.length} of {data.count} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { const next = Math.max(page - 1, 1); setPage(next); load(next, tab) }}
                  disabled={!data.previous}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Prev
                </button>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-md" style={{ backgroundColor: theme.accent }}>{page}</span>
                <button
                  type="button"
                  onClick={() => { const next = page + 1; setPage(next); load(next, tab) }}
                  disabled={!data.next}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminShell>

      {editingRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex shrink-0 items-start justify-between p-6 pb-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manage Visit Request</h3>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
              <p className="font-semibold text-slate-900 dark:text-white">
                {editingRequest.vehicle_year} {editingRequest.vehicle_brand_name} {editingRequest.vehicle_model_name}
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{editingRequest.full_name} · {editingRequest.phone}</p>
              {editingRequest.preferred_date ? (
                <p className="mt-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Calendar size={13} />
                  {fmtDate(editingRequest.preferred_date)}{editingRequest.preferred_time ? ` · ${fmtTime(editingRequest.preferred_time)}` : ''}
                </p>
              ) : null}
              {editingRequest.message ? <p className="mt-1 text-slate-500 dark:text-slate-400">"{editingRequest.message}"</p> : null}
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">Timeline</label>
              {eventsLoading ? (
                <p className="text-sm text-slate-400">Loading history...</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-slate-400">No history yet.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-3 pr-2 dark:border-slate-800 dark:bg-slate-900/30">
                  <div className="space-y-0 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                    {events.map((event, idx) => (
                      <div key={event.id} className={`relative ${idx === events.length - 1 ? '' : 'pb-4'}`}>
                        <span
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 ${statusDotColor(event.to_status)}`}
                        />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {statusLabel(event.to_status)}
                          <span className="ml-1.5 font-normal text-slate-400">by {event.changed_by_name}</span>
                        </p>
                        <p className="text-xs text-slate-400">{fmtDateTime(event.created_at)}</p>
                        {event.note ? (
                          <p className="mt-1 text-sm italic text-slate-500 dark:text-slate-400">"{event.note}"</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Status</label>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(editStatus)}`} />
                    {statusLabel(editStatus)}
                  </span>
                  <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {statusDropdownOpen ? (
                  <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900">
                    <div className="py-1">
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = editStatus === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setEditStatus(opt.value); setStatusDropdownOpen(false) }}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                              isActive
                                ? 'bg-slate-50 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotColor(opt.value)}`} />
                            {opt.label}
                            {isActive && <Check size={13} className="ml-auto text-emerald-500" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Staff Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Internal notes for this booking"
                className="h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100"
              />
            </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => setEditingRequest(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: theme.accent }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
