import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { cancelBooking, createBooking } from '../../utils/dealerBookings'
import ActionReasonModal from '../ActionReasonModal'
import CreateBookingModal from './CreateBookingModal'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_STYLES = {
  active: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  converted_to_sale: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

export default function BookingsSection({ vehicle, bookings, reservations, onChanged, showToast }) {
  const { theme } = useTenantBranding()
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)

  const sorted = [...bookings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const activeReservations = reservations.filter((r) => r.status === 'active')

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Bookings</p>
        <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
          <Plus size={14} /> New Booking
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">No bookings yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{b.customer_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{b.booking_date} · amount {fmtMoney(b.booking_amount)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[b.status] || STATUS_STYLES.active}`}>
                  {b.status.replace(/_/g, ' ')}
                </span>
                {b.status === 'active' ? (
                  <button type="button" onClick={() => setCancelTarget(b)} className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:border-rose-800">Cancel</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <CreateBookingModal
          reservations={activeReservations}
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            await createBooking(vehicle.id, payload)
            showToast('success', 'Booking created.')
            onChanged()
          }}
        />
      ) : null}
      {cancelTarget ? (
        <ActionReasonModal
          title="Cancel Booking"
          confirmLabel="Cancel Booking"
          destructive
          onClose={() => setCancelTarget(null)}
          onConfirm={async (reason) => {
            await cancelBooking(cancelTarget.id, { reason })
            showToast('success', 'Booking cancelled.')
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
