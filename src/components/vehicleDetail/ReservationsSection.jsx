import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { cancelReservation, createReservation } from '../../utils/dealerReservations'
import ActionReasonModal from '../ActionReasonModal'
import CreateReservationModal from './CreateReservationModal'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_STYLES = {
  active: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  converted_to_booking: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  expired: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

export default function ReservationsSection({ vehicle, reservations, onChanged, showToast }) {
  const { theme } = useTenantBranding()
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)

  const sorted = [...reservations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Reservations</p>
        <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
          <Plus size={14} /> New Reservation
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">No reservations yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.customer_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {r.reservation_date} · expires {r.expiry_date || '—'} · deposit {fmtMoney(r.deposit_amount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[r.status] || STATUS_STYLES.active}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
                {r.status === 'active' ? (
                  <button type="button" onClick={() => setCancelTarget(r)} className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:border-rose-800">Cancel</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <CreateReservationModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            await createReservation(vehicle.id, payload)
            showToast('success', 'Reservation created.')
            onChanged()
          }}
        />
      ) : null}
      {cancelTarget ? (
        <ActionReasonModal
          title="Cancel Reservation"
          confirmLabel="Cancel Reservation"
          destructive
          onClose={() => setCancelTarget(null)}
          onConfirm={async (reason) => {
            await cancelReservation(cancelTarget.id, { reason })
            showToast('success', 'Reservation cancelled.')
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
