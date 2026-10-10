import { useState } from 'react'
import { useTenantBranding } from '../../context/TenantBrandingContext.jsx'
import { createSettlement, markSettlementPaid } from '../../utils/dealerSettlement'
import NotesOnlyActionModal from './NotesOnlyActionModal'

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SettlementSubpanel({ sale, onChanged, showToast }) {
  const { theme } = useTenantBranding()
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const settlement = sale.settlement

  const markPaid = async () => {
    setBusy(true)
    try {
      await markSettlementPaid(sale.id, {})
      showToast('success', 'Settlement marked as paid.')
      onChanged()
    } catch (err) {
      showToast('error', err.message || 'Failed to mark settlement as paid.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Settlement</p>
        {!settlement ? (
          <button type="button" onClick={() => setModalOpen(true)} className="rounded-lg px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
            Create Settlement
          </button>
        ) : settlement.settlement_status !== 'paid' ? (
          <button type="button" disabled={busy} onClick={markPaid} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Mark Paid
          </button>
        ) : null}
      </div>
      {!settlement ? (
        <p className="text-sm text-slate-400">Not yet settled.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300">
          <p>Commission ({settlement.commission_type}): <span className="font-semibold">{fmtMoney(settlement.commission_amount)}</span></p>
          <p>Dealer Expenses: <span className="font-semibold">{fmtMoney(settlement.dealer_expenses_total)}</span></p>
          <p>Owner Payable: <span className="font-semibold">{fmtMoney(settlement.owner_payable)}</span></p>
          <p>Net Dealer Profit: <span className="font-semibold">{fmtMoney(settlement.net_dealer_profit)}</span></p>
          <p className="col-span-2">Status: <span className="font-semibold capitalize">{settlement.settlement_status}</span></p>
        </div>
      )}

      {modalOpen ? (
        <NotesOnlyActionModal
          title="Create Settlement"
          body="Commission and payout figures will be computed automatically from the vehicle's acquisition record."
          confirmLabel="Create Settlement"
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            await createSettlement(sale.id, payload)
            showToast('success', 'Settlement created.')
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
