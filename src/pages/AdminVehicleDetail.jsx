import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Car } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import VehicleAcquisitionTab from '../components/vehicleDetail/VehicleAcquisitionTab'
import VehicleDocumentsTab from '../components/vehicleDetail/VehicleDocumentsTab'
import VehicleOverviewTab from '../components/vehicleDetail/VehicleOverviewTab'
import VehicleSalesPipelineTab from '../components/vehicleDetail/VehicleSalesPipelineTab'
import VehicleTimelineTab from '../components/vehicleDetail/VehicleTimelineTab'
import VehicleWorkExpensesTab from '../components/vehicleDetail/VehicleWorkExpensesTab'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { getInventoryVehicle } from '../utils/inventoryVehicles'
import { fetchUserNavModules } from '../utils/modules'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'acquisition', label: 'Acquisition & Ownership' },
  { id: 'work-expenses', label: 'Work & Expenses' },
  { id: 'documents', label: 'Documents' },
  { id: 'sales-pipeline', label: 'Sales Pipeline' },
  { id: 'timeline', label: 'Timeline & Pricing' },
]

// Which submodule permission unlocks each tab — e.g. a staff member granted
// only "Vehicle Work & Expenses" (not "Inventory Vehicles" or "Sales,
// Booking & Delivery") sees just that one tab, not the whole vehicle record.
// Basic vehicle info/documents/timeline/acquisition ride along with the
// general "Inventory Vehicles" permission since there's no finer-grained
// backend permission for them yet.
const TAB_PERMISSION = {
  overview: 'inventory_vehicles',
  acquisition: 'inventory_vehicles',
  'work-expenses': 'vehicle_work_expenses',
  documents: 'inventory_vehicles',
  'sales-pipeline': 'vehicle_sales',
  timeline: 'inventory_vehicles',
}

const STATUS_STYLES = {
  available: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  booked: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  sold: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  delivered: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function AdminVehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permittedKeys, setPermittedKeys] = useState(null) // null = still resolving

  const loadVehicle = useCallback(() => {
    setLoading(true)
    setError('')
    return getInventoryVehicle(id)
      .then((data) => setVehicle(data))
      .catch((err) => {
        if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
        setError(err.message || 'Failed to load vehicle.')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadVehicle() }, [loadVehicle])

  useEffect(() => {
    let cancelled = false
    fetchUserNavModules()
      .then((modules) => {
        if (cancelled) return
        const portfolio = (modules || []).find((m) => m.key === 'portfolio')
        setPermittedKeys(new Set((portfolio?.submodules || []).map((s) => s.key)))
      })
      .catch(() => {
        if (cancelled) return
        // Fail open — a permission-fetch hiccup shouldn't block someone who
        // already reached this page (nav visibility isn't a security
        // boundary here; the backend doesn't enforce per-submodule access
        // on these endpoints either).
        setPermittedKeys(new Set(Object.values(TAB_PERMISSION)))
      })
    return () => { cancelled = true }
  }, [])

  const visibleTabs = permittedKeys ? TABS.filter((t) => permittedKeys.has(TAB_PERMISSION[t.id])) : []

  useEffect(() => {
    if (!permittedKeys || visibleTabs.length === 0) return
    if (!visibleTabs.some((t) => t.id === tab)) {
      setSearchParams({ tab: visibleTabs[0].id }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permittedKeys, tab])

  const setTab = (next) => setSearchParams({ tab: next })

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1180px] space-y-5">
        <button type="button" onClick={() => navigate('/admin/portfolio/inventory')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft size={15} /> Back to Inventory
        </button>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">Loading vehicle...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div>
        ) : !vehicle ? null : (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                {vehicle.cover_thumbnail_url || vehicle.photo_urls?.[0]?.url ? (
                  <img src={vehicle.cover_thumbnail_url || vehicle.photo_urls[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Car size={22} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {vehicle.brand_name} {vehicle.vehicle_model_name} ({vehicle.year})
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{vehicle.registration_no || 'No registration number'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[vehicle.status] || STATUS_STYLES.available}`}>
                  {vehicle.status}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {vehicle.inventory_type === 'customer_consignment' ? 'Consignment' : 'Owned'}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{fmtMoney(vehicle.listing_price)}</span>
              </div>
            </div>

            {!permittedKeys ? (
              <p className="text-sm text-slate-400">Loading permissions...</p>
            ) : visibleTabs.length === 0 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                You don't have permission to view any details for this vehicle.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {visibleTabs.map((t) => (
                    <button
                      key={t.id}
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

                <div>
                  {tab === 'overview' ? <VehicleOverviewTab vehicle={vehicle} /> : null}
                  {tab === 'acquisition' ? <VehicleAcquisitionTab vehicle={vehicle} /> : null}
                  {tab === 'work-expenses' ? <VehicleWorkExpensesTab vehicle={vehicle} /> : null}
                  {tab === 'documents' ? <VehicleDocumentsTab vehicle={vehicle} /> : null}
                  {tab === 'sales-pipeline' ? <VehicleSalesPipelineTab vehicle={vehicle} reloadVehicle={loadVehicle} /> : null}
                  {tab === 'timeline' ? <VehicleTimelineTab vehicle={vehicle} /> : null}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AdminShell>
  )
}
