import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchBodyTypes, fetchBrands, fetchFuelTypes, fetchModels } from '../utils/vehicles'
import SearchableSelect from './SearchableSelect'

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

/**
 * Trade-in leads only — staff confirms the real catalog entries (the lead's
 * trade_in_brand/model are free-text hints, not guaranteed to exist in this
 * tenant's VehicleBrand/VehicleModel catalog) plus the appraisal numbers,
 * then this creates the InventoryVehicle + VehicleAcquisition.
 */
export default function ConvertLeadToInventoryModal({ lead, onClose, onSubmit }) {
  const { theme } = useTenantBranding()
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [bodyTypeId, setBodyTypeId] = useState('')
  const [fuelTypeId, setFuelTypeId] = useState('')
  const [year, setYear] = useState(lead.trade_in_year || '')
  const [odometer, setOdometer] = useState(lead.trade_in_odometer_km || '')
  const [registrationNo, setRegistrationNo] = useState(lead.trade_in_registration_no || '')
  const [listingPrice, setListingPrice] = useState('')
  const [purchasePrice, setPurchasePrice] = useState(lead.trade_in_expected_price || '')
  const [acquisitionDate, setAcquisitionDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [bodyTypes, setBodyTypes] = useState([])
  const [fuelTypes, setFuelTypes] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBrands({ pageSize: 'all' }).then((data) => setBrands(Array.isArray(data) ? data : data?.results || [])).catch(() => setBrands([]))
    fetchBodyTypes().then((data) => setBodyTypes(Array.isArray(data) ? data : data?.results || [])).catch(() => setBodyTypes([]))
    fetchFuelTypes().then((data) => setFuelTypes(Array.isArray(data) ? data : data?.results || [])).catch(() => setFuelTypes([]))
  }, [])

  useEffect(() => {
    setModelId('')
    if (!brandId) { setModels([]); return }
    fetchModels({ brandId, pageSize: 'all' }).then((data) => setModels(Array.isArray(data) ? data : data?.results || [])).catch(() => setModels([]))
  }, [brandId])

  const brandOptions = brands.map((b) => ({ id: b.id, name: b.name }))
  const modelOptions = models.map((m) => ({ id: m.id, name: m.name }))
  const bodyTypeOptions = bodyTypes.map((b) => ({ id: b.id, name: b.name }))
  const fuelTypeOptions = fuelTypes.map((f) => ({ id: f.id, name: f.name }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!brandId || !modelId || !bodyTypeId || !fuelTypeId || !year) {
      setError('Brand, model, body type, fuel type, and year are all required.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        vehicle_type: bodyTypeId,
        brand: brandId,
        vehicle_model: modelId,
        fuel_type: fuelTypeId,
        year: Number(year),
        mileage_km: odometer || 0,
        registration_no: registrationNo.trim(),
        listing_price: listingPrice || 0,
        purchase_price: purchasePrice || null,
        acquisition_date: acquisitionDate || null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to convert lead to an inventory vehicle.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between p-6 pb-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Convert to Inventory</h3>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Their hint: {lead.trade_in_brand || '—'} {lead.trade_in_model || ''} {lead.trade_in_year ? `(${lead.trade_in_year})` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-6 pt-3 space-y-4">
          {error ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Brand *</label>
              <SearchableSelect value={brandId} options={brandOptions} onChange={setBrandId} placeholder="Select brand" accent={theme.accent} accentSoft={theme.accentSoft} />
            </div>
            <div>
              <label className={labelCls}>Model *</label>
              <SearchableSelect value={modelId} options={modelOptions} onChange={setModelId} placeholder={brandId ? 'Select model' : 'Pick a brand first'} disabled={!brandId} accent={theme.accent} accentSoft={theme.accentSoft} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Body Type *</label>
              <SearchableSelect value={bodyTypeId} options={bodyTypeOptions} onChange={setBodyTypeId} placeholder="Select body type" accent={theme.accent} accentSoft={theme.accentSoft} />
            </div>
            <div>
              <label className={labelCls}>Fuel Type *</label>
              <SearchableSelect value={fuelTypeId} options={fuelTypeOptions} onChange={setFuelTypeId} placeholder="Select fuel type" accent={theme.accent} accentSoft={theme.accentSoft} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Year *</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Odometer (km)</label>
              <input type="number" min="0" value={odometer} onChange={(e) => setOdometer(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Registration No.</label>
              <input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Purchase Price (₹)</label>
              <input type="number" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className={inputCls} placeholder="What you're paying them" />
            </div>
            <div>
              <label className={labelCls}>Listing Price (₹)</label>
              <input type="number" min="0" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} className={inputCls} placeholder="What you'll list it for" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Acquisition Date</label>
            <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} className={inputCls} />
          </div>
        </form>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
            {saving ? 'Converting...' : 'Convert to Inventory'}
          </button>
        </div>
      </div>
    </div>
  )
}
