import { useState } from 'react'
import { cancelSale } from '../../utils/dealerSales'
import ActionReasonModal from '../ActionReasonModal'
import DeliverySubpanel from './DeliverySubpanel'
import InvoiceSubpanel from './InvoiceSubpanel'
import SettlementSubpanel from './SettlementSubpanel'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ActiveSalePanel({ vehicle, sale, onChanged, showToast }) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const isConsignment = vehicle.inventory_type === 'customer_consignment'

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Sale Confirmed — {fmtMoney(sale.final_sale_price)}</p>
          <button type="button" onClick={() => setCancelOpen(true)} className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-600 dark:border-rose-800">
            Cancel Sale
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Buyer: {sale.buyer_name} · Sale Date: {sale.sale_date}
          {Number(sale.discount_amount) > 0 ? ` · Discount: ${fmtMoney(sale.discount_amount)}` : ''}
        </p>
      </div>

      <DeliverySubpanel sale={sale} onChanged={onChanged} showToast={showToast} />
      {isConsignment ? <SettlementSubpanel sale={sale} onChanged={onChanged} showToast={showToast} /> : null}
      <InvoiceSubpanel sale={sale} showToast={showToast} />

      {cancelOpen ? (
        <ActionReasonModal
          title="Cancel Sale"
          confirmLabel="Cancel Sale"
          destructive
          onClose={() => setCancelOpen(false)}
          onConfirm={async (reason) => {
            await cancelSale(sale.id, { reason })
            showToast('success', 'Sale cancelled.')
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
