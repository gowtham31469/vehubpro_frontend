import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { createSale } from '../../utils/dealerSales'
import ActiveSalePanel from './ActiveSalePanel'
import ConfirmSaleModal from './ConfirmSaleModal'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SaleSection({ vehicle, sales, bookings, onChanged, showToast }) {
  const { theme } = useTenantBranding()
  const [modalOpen, setModalOpen] = useState(false)
  const [pastOpen, setPastOpen] = useState(false)

  const confirmedSale = sales.find((s) => s.status === 'confirmed')
  const pastSales = sales.filter((s) => s.status !== 'confirmed').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const activeBookings = bookings.filter((b) => b.status === 'active')

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Sale</p>
        {!confirmedSale ? (
          <button type="button" onClick={() => setModalOpen(true)} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
            Confirm Sale
          </button>
        ) : null}
      </div>

      {confirmedSale ? (
        <ActiveSalePanel vehicle={vehicle} sale={confirmedSale} onChanged={onChanged} showToast={showToast} />
      ) : (
        <p className="text-sm text-slate-400">No confirmed sale yet.</p>
      )}

      {pastSales.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button type="button" onClick={() => setPastOpen((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Past sales ({pastSales.length}) <ChevronDown size={14} className={`transition-transform ${pastOpen ? 'rotate-180' : ''}`} />
          </button>
          {pastOpen ? (
            <div className="mt-2 space-y-2">
              {pastSales.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                  <p className="text-slate-700 dark:text-slate-300">{fmtMoney(s.final_sale_price)} · {s.buyer_name} · {s.sale_date}</p>
                  {s.cancellation_reason ? <p className="mt-1 text-xs italic text-slate-400">Cancelled: {s.cancellation_reason}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {modalOpen ? (
        <ConfirmSaleModal
          bookings={activeBookings}
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            await createSale(vehicle.id, payload)
            showToast('success', 'Sale confirmed.')
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
