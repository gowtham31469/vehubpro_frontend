import { useEffect, useState } from 'react'
import { fetchVehicleProfitability } from '../../utils/dealerProfitability'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm ${strong ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
        {value}
      </span>
    </div>
  )
}

export default function VehicleOverviewTab({ vehicle }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchVehicleProfitability(vehicle.id)
      .then((res) => { if (!cancelled) setData(res) })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load profitability.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicle.id])

  const isConsignment = vehicle.inventory_type === 'customer_consignment'

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Vehicle</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatRow label="Year" value={vehicle.year} />
          <StatRow label="Mileage" value={`${Number(vehicle.mileage_km || 0).toLocaleString('en-IN')} km`} />
          <StatRow label="Fuel" value={vehicle.fuel_type_name || '—'} />
          <StatRow label="Transmission" value={vehicle.transmission === 'manual' ? 'Manual' : 'Automatic'} />
          <StatRow label="Registration" value={vehicle.registration_no || '—'} />
          <StatRow label="Listing Price" value={fmtMoney(vehicle.listing_price)} strong />
          <StatRow label="Status" value={<span className="capitalize">{vehicle.status}</span>} />
          <StatRow label="Inventory Type" value={isConsignment ? 'Customer Consignment' : 'Owned'} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Profitability</p>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : !data ? (
          <p className="text-sm text-slate-400">No data available.</p>
        ) : isConsignment ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <StatRow label="Owner Expected Price" value={fmtMoney(data.owner_expected_price)} />
            <StatRow label="Listing Price" value={fmtMoney(data.listing_price)} />
            <StatRow label="Dealer Expenses So Far" value={fmtMoney(data.dealer_expenses_so_far)} />
            {data.settlement_status ? (
              <>
                <StatRow label="Final Sale Price" value={fmtMoney(data.final_sale_price)} strong />
                <StatRow label="Commission Amount" value={fmtMoney(data.commission_amount)} />
                <StatRow label="Owner Payable" value={fmtMoney(data.owner_payable)} strong />
                <StatRow label="Net Dealer Profit" value={fmtMoney(data.net_dealer_profit)} strong />
                <StatRow label="Settlement Status" value={<span className="capitalize">{data.settlement_status}</span>} />
              </>
            ) : (
              <p className="pt-3 text-sm italic text-slate-400">{data.note}</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <StatRow label="Purchase Price" value={fmtMoney(data.purchase_price)} />
            <StatRow label="Total Work Expenses" value={fmtMoney(data.total_work_expenses)} />
            <StatRow label="Total Landed Cost" value={fmtMoney(data.total_landed_cost)} strong />
            <StatRow label="Listing Price" value={fmtMoney(data.listing_price)} />
            {data.gross_profit !== undefined ? (
              <>
                <StatRow label="Final Sale Price" value={fmtMoney(data.final_sale_price)} strong />
                <StatRow label="Gross Profit" value={fmtMoney(data.gross_profit)} strong />
                <StatRow
                  label="Gross Margin %"
                  value={data.gross_margin_percent !== null && data.gross_margin_percent !== undefined ? `${Number(data.gross_margin_percent).toFixed(2)}%` : '—'}
                />
              </>
            ) : (
              <>
                <StatRow label="Estimated Profit at Listing" value={fmtMoney(data.estimated_profit_at_listing)} strong />
                <p className="pt-3 text-sm italic text-slate-400">{data.note}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
