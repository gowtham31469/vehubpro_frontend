import { useState } from 'react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { saveDelivery } from '../../utils/dealerDelivery'
import RecordDeliveryModal from './RecordDeliveryModal'

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DeliverySubpanel({ sale, onChanged, showToast }) {
  const { theme } = useTenantBranding()
  const [modalOpen, setModalOpen] = useState(false)
  const delivery = sale.delivery

  return (
    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Delivery</p>
        {!delivery ? (
          <button type="button" onClick={() => setModalOpen(true)} className="rounded-lg px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
            Record Delivery
          </button>
        ) : null}
      </div>
      {!delivery ? (
        <p className="text-sm text-slate-400">Not yet delivered.</p>
      ) : (
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <p>Delivered on {fmtDate(delivery.delivery_date)}</p>
          {delivery.handover_notes ? <p className="mt-1 text-xs italic text-slate-400">"{delivery.handover_notes}"</p> : null}
        </div>
      )}

      {modalOpen ? (
        <RecordDeliveryModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            await saveDelivery(sale.id, payload)
            showToast('success', 'Delivery recorded.')
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
