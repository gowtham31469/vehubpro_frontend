import { useEffect, useState } from 'react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { fetchPricingHistory } from '../../utils/dealerPricingHistory'
import { fetchVehicleTimeline } from '../../utils/dealerTimeline'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const CATEGORY_DOT = {
  inventory: 'bg-slate-400', ownership: 'bg-indigo-500', acquisition: 'bg-blue-500', inspection: 'bg-cyan-500',
  work_expense: 'bg-orange-500', pricing: 'bg-amber-500', listing: 'bg-teal-500', documents: 'bg-slate-500',
  status: 'bg-purple-500', system: 'bg-slate-400', customer: 'bg-pink-500', quotation: 'bg-sky-500',
  negotiation: 'bg-violet-500', reservation: 'bg-fuchsia-500', booking: 'bg-amber-600', sale: 'bg-emerald-600',
  payment: 'bg-green-600', settlement: 'bg-emerald-700',
}

export default function VehicleTimelineTab({ vehicle }) {
  const { theme } = useTenantBranding()
  const [priceHistory, setPriceHistory] = useState([])
  const [priceLoading, setPriceLoading] = useState(true)

  const [events, setEvents] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [eventsLoading, setEventsLoading] = useState(true)

  useEffect(() => {
    fetchPricingHistory(vehicle.id)
      .then((data) => setPriceHistory(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setPriceHistory([]))
      .finally(() => setPriceLoading(false))
  }, [vehicle.id])

  const loadTimeline = (p = page) => {
    setEventsLoading(true)
    fetchVehicleTimeline(vehicle.id, { page: p })
      .then((data) => { setEvents(data); setPage(p) })
      .catch(() => {})
      .finally(() => setEventsLoading(false))
  }

  useEffect(() => { loadTimeline(1) }, [vehicle.id])

  const rows = events.results || []

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Pricing History</p>
        {priceLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : priceHistory.length === 0 ? (
          <p className="text-sm text-slate-400">No price changes recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {priceHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-semibold capitalize text-slate-800 dark:text-slate-200">{h.price_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-400">{h.reason || '—'} · by {h.changed_by_name}</p>
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{fmtMoney(h.old_value)} → {fmtMoney(h.new_value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Timeline</p>
        {eventsLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">No history yet.</p>
        ) : (
          <div className="space-y-0 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            {rows.map((event, idx) => (
              <div key={event.id} className={`relative ${idx === rows.length - 1 ? '' : 'pb-4'}`}>
                <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${CATEGORY_DOT[event.category] || 'bg-slate-400'}`} />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {event.title}
                  <span className="ml-1.5 font-normal text-slate-400">by {event.actor_name}</span>
                </p>
                <p className="text-xs text-slate-400">{fmtDateTime(event.created_at)}</p>
                {event.description ? <p className="mt-1 text-sm italic text-slate-500 dark:text-slate-400">{event.description}</p> : null}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800/60">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Showing {rows.length} of {events.count} entries</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!events.previous} onClick={() => loadTimeline(Math.max(page - 1, 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400">Prev</button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: theme.accent }}>{page}</span>
            <button type="button" disabled={!events.next} onClick={() => loadTimeline(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
