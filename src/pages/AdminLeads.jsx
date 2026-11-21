import { useEffect, useRef, useState } from 'react'
import { Calendar, Check, ChevronDown, Plus, Search, UserCheck, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import AddLeadModal from '../components/AddLeadModal'
import ConvertLeadToInventoryModal from '../components/ConvertLeadToInventoryModal'
import CustomerPicker from '../components/CustomerPicker'
import StaffPicker from '../components/StaffPicker'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { convertLead, convertLeadToInventory, createLead, fetchLeadEvents, fetchLeads, updateLead } from '../utils/leads'

const TABS = [
  { id: '', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'converted', label: 'Converted' },
  { id: 'lost', label: 'Lost' },
]

const DUE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'today', label: 'Due today' },
  { id: 'overdue', label: 'Overdue' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

const LOST_REASON_OPTIONS = [
  { value: 'price', label: 'Price too high' },
  { value: 'bought_elsewhere', label: 'Bought elsewhere' },
  { value: 'finance_declined', label: 'Finance declined' },
  { value: 'unresponsive', label: 'Unresponsive' },
  { value: 'vehicle_sold', label: 'Vehicle sold' },
  { value: 'other', label: 'Other' },
]

function statusBadgeStyle(status) {
  switch (status) {
    case 'new': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
    case 'contacted': return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
    case 'qualified': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
    case 'follow_up': return 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300'
    case 'converted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'lost': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
  }
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || status
}

function statusDotColor(status) {
  switch (status) {
    case 'new': return 'bg-sky-500'
    case 'contacted': return 'bg-amber-500'
    case 'qualified': return 'bg-violet-500'
    case 'follow_up': return 'bg-orange-500'
    case 'converted': return 'bg-emerald-500'
    case 'lost': return 'bg-rose-500'
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

function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return null
  return `₹${Number(n).toLocaleString('en-IN')}`
}

function isOverdue(row) {
  if (!row.next_follow_up_at || row.status === 'converted' || row.status === 'lost') return false
  return row.next_follow_up_at < new Date().toISOString().slice(0, 10)
}

function subjectLabel(row) {
  if (row.enquiry_type === 'trade_in') {
    const bits = [row.trade_in_brand, row.trade_in_model, row.trade_in_year ? `(${row.trade_in_year})` : ''].filter(Boolean)
    return bits.length ? `Trade-in — ${bits.join(' ')}` : 'Trade-in enquiry'
  }
  if (row.vehicle) {
    return `${row.vehicle_year ?? ''} ${row.vehicle_brand_name ?? ''} ${row.vehicle_model_name ?? ''}`.trim() || 'Specific vehicle'
  }
  const bits = []
  if (row.preferred_brand_name) bits.push(row.preferred_brand_name)
  if (row.preferred_vehicle_type_name) bits.push(row.preferred_vehicle_type_name)
  const budget = fmtMoney(row.budget_min) && fmtMoney(row.budget_max)
    ? `${fmtMoney(row.budget_min)}–${fmtMoney(row.budget_max)}`
    : fmtMoney(row.budget_max) || fmtMoney(row.budget_min)
  if (budget) bits.push(budget)
  return bits.length ? `General — ${bits.join(' · ')}` : 'General enquiry'
}

export default function AdminLeads() {
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [tab, setTab] = useState('')
  const [due, setDue] = useState('')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [data, setData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)

  const [editingLead, setEditingLead] = useState(null)
  const [editStatus, setEditStatus] = useState('new')
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [editFollowUp, setEditFollowUp] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLostReason, setEditLostReason] = useState('')
  const [editLostNotes, setEditLostNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const statusDropdownRef = useRef(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const [convertCustomerId, setConvertCustomerId] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertInventoryOpen, setConvertInventoryOpen] = useState(false)

  useEffect(() => {
    if (!statusDropdownOpen) return undefined
    function handleClickOutside(e) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) setStatusDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [statusDropdownOpen])

  const load = async (targetPage = page, targetTab = tab, targetDue = due, targetSearch = debouncedSearchText) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const result = await fetchLeads({ page: targetPage, status: targetTab, due: targetDue, search: targetSearch })
      setData(result)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
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
    load(1, tab, due, debouncedSearchText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, due, debouncedSearchText])

  const rows = data.results || []

  const openEdit = (row) => {
    setEditingLead(row)
    setEditStatus(row.status)
    setEditAssignedTo(row.assigned_to ? String(row.assigned_to) : '')
    setEditFollowUp(row.next_follow_up_at || '')
    setEditNotes(row.staff_notes || '')
    setEditLostReason(row.lost_reason || '')
    setEditLostNotes(row.lost_notes || '')
    setConvertCustomerId('')
    setStatusDropdownOpen(false)
    setEvents([])
    setEventsLoading(true)
    fetchLeadEvents(row.id)
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }

  const handleSave = async () => {
    if (!editingLead) return
    if (editStatus === 'lost' && !editLostReason) {
      showToast('error', 'Pick a lost reason before marking this lead as lost.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        status: editStatus,
        assigned_to: editAssignedTo || null,
        next_follow_up_at: editFollowUp || null,
        staff_notes: editNotes,
      }
      if (editStatus === 'lost') {
        payload.lost_reason = editLostReason
        payload.lost_notes = editLostNotes
      }
      await updateLead(editingLead.id, payload)
      showToast('success', 'Lead updated.')
      setEditingLead(null)
      await load(page, tab, due)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Could not update lead.')
    } finally {
      setSaving(false)
    }
  }

  const handleConvert = async () => {
    if (!editingLead || !convertCustomerId) return
    setConverting(true)
    try {
      const result = await convertLead(editingLead.id, { customer_id: convertCustomerId })
      showToast('success', 'Lead converted to customer.')
      setEditingLead(result.lead)
      await load(page, tab, due)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      showToast('error', err.message || 'Could not convert lead.')
    } finally {
      setConverting(false)
    }
  }

  const handleAddLead = async (payload) => {
    await createLead(payload)
    showToast('success', 'Lead created.')
    await load(1, tab, due)
    setPage(1)
  }

  const handleConvertToInventory = async (payload) => {
    const result = await convertLeadToInventory(editingLead.id, payload)
    showToast('success', 'Lead converted to an inventory vehicle.')
    setEditingLead(result.lead)
    setConvertInventoryOpen(false)
    await load(page, tab, due)
  }

  return (
    <>
      <AdminShell>
        <div className="mx-auto max-w-[1220px] space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Leads</h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">Who's asking about a car, what they want, and when to follow up.</p>
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              <Plus size={16} /> Add Lead
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id || 'all'}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === t.id ? 'text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
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

          <div className="flex flex-wrap gap-2">
            {DUE_FILTERS.map((d) => (
              <button
                key={d.id || 'all-due'}
                type="button"
                onClick={() => setDue(d.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  due === d.id
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{errorMessage}</div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Next Follow-up</th>
                    <th className="px-6 py-4">Assigned To</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr><td className="px-6 py-8 text-slate-500" colSpan={7}>Loading leads...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td className="px-6 py-8 text-slate-500" colSpan={7}>No leads found.</td></tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="max-w-[220px] px-6 py-4 font-semibold text-slate-900 dark:text-white">{subjectLabel(row)}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{row.phone}{row.email ? ` · ${row.email}` : ''}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.source?.replace('_', ' ')}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 ${isOverdue(row) ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            <Calendar size={13} />{fmtDate(row.next_follow_up_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.assigned_to_name || '—'}</td>
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
                  onClick={() => { const next = Math.max(page - 1, 1); setPage(next); load(next, tab, due) }}
                  disabled={!data.previous}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Prev
                </button>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-md" style={{ backgroundColor: theme.accent }}>{page}</span>
                <button
                  type="button"
                  onClick={() => { const next = page + 1; setPage(next); load(next, tab, due) }}
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

      {addModalOpen ? (
        <AddLeadModal onClose={() => setAddModalOpen(false)} onSubmit={handleAddLead} />
      ) : null}

      {editingLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex shrink-0 items-start justify-between p-6 pb-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manage Lead</h3>
              <button type="button" onClick={() => setEditingLead(null)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                <p className="font-semibold text-slate-900 dark:text-white">{subjectLabel(editingLead)}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{editingLead.full_name} · {editingLead.phone}{editingLead.email ? ` · ${editingLead.email}` : ''}</p>
                {editingLead.message ? <p className="mt-1 text-slate-500 dark:text-slate-400">"{editingLead.message}"</p> : null}
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
                          <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 ${statusDotColor(event.to_status)}`} />
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {statusLabel(event.to_status)}
                            <span className="ml-1.5 font-normal text-slate-400">by {event.changed_by_name}</span>
                          </p>
                          <p className="text-xs text-slate-400">{fmtDateTime(event.created_at)}</p>
                          {event.note ? <p className="mt-1 text-sm italic text-slate-500 dark:text-slate-400">"{event.note}"</p> : null}
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
                                isActive ? 'bg-slate-50 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
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

              {editStatus === 'lost' ? (
                <div className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-rose-700 dark:text-rose-400">Lost Reason *</label>
                    <select
                      value={editLostReason}
                      onChange={(e) => setEditLostReason(e.target.value)}
                      className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-rose-900/50 dark:bg-slate-950/50 dark:text-slate-100"
                    >
                      <option value="">Select a reason</option>
                      {LOST_REASON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-rose-700 dark:text-rose-400">Lost Notes</label>
                    <textarea
                      value={editLostNotes}
                      onChange={(e) => setEditLostNotes(e.target.value)}
                      className="h-16 w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-rose-900/50 dark:bg-slate-950/50 dark:text-slate-100"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <StaffPicker value={editAssignedTo} onChange={setEditAssignedTo} label="Assigned To" />
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Next Follow-up</label>
                <input
                  type="date"
                  value={editFollowUp}
                  onChange={(e) => setEditFollowUp(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100"
                />
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Staff Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Internal notes"
                  className="h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100"
                />
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                {editingLead.enquiry_type === 'trade_in' ? (
                  editingLead.converted_vehicle ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                      <UserCheck size={16} />
                      Converted — <span className="font-semibold">{editingLead.converted_vehicle_label}</span>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Trade-In</label>
                      <button
                        type="button"
                        onClick={() => setConvertInventoryOpen(true)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50"
                        style={{ backgroundColor: theme.accent }}
                      >
                        Convert to Inventory
                      </button>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Appraise their vehicle and pick the real catalog entries — this also creates/links a Customer record for them.
                      </p>
                    </div>
                  )
                ) : editingLead.customer ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <UserCheck size={16} />
                    Converted — <span className="font-semibold">{editingLead.customer_name}</span>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Convert to Customer</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <CustomerPicker value={convertCustomerId} onChange={setConvertCustomerId} />
                      </div>
                      <button
                        type="button"
                        onClick={handleConvert}
                        disabled={!convertCustomerId || converting}
                        className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50"
                        style={{ backgroundColor: theme.accent }}
                      >
                        {converting ? 'Converting...' : 'Convert'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Pick an existing customer, or use "+" to add a new one first.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => setEditingLead(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {convertInventoryOpen && editingLead ? (
        <ConvertLeadToInventoryModal
          lead={editingLead}
          onClose={() => setConvertInventoryOpen(false)}
          onSubmit={handleConvertToInventory}
        />
      ) : null}
    </>
  )
}
