import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchInventoryVehicles } from '../utils/inventoryVehicles'
import { fetchBodyTypes, fetchBrands, fetchModels } from '../utils/vehicles'
import SearchableSelect from './SearchableSelect'
import StaffPicker from './StaffPicker'

const ENQUIRY_TYPE_OPTIONS = [
  { value: 'specific_vehicle', label: 'Specific Vehicle' },
  { value: 'general_search', label: 'General Search' },
  { value: 'trade_in', label: 'Trade-In' },
]

const SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'classifieds', label: 'Classifieds/Portal' },
  { value: 'other', label: 'Other' },
]

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

const emptyForm = {
  enquiry_type: 'specific_vehicle',
  vehicle: '',
  preferred_brand: '',
  preferred_vehicle_type: '',
  budget_min: '',
  budget_max: '',
  trade_in_brand_id: '',
  trade_in_model_id: '',
  trade_in_year: '',
  trade_in_registration_no: '',
  trade_in_odometer_km: '',
  trade_in_expected_price: '',
  full_name: '',
  phone: '',
  email: '',
  source: 'walk_in',
  assigned_to: '',
  next_follow_up_at: '',
  message: '',
}

/**
 * Staff "Add Lead" — walk-ins/phone calls (VisitRequest has no equivalent,
 * since it's customer-only; patterned after ConfirmSaleModal.jsx's shape).
 */
export default function AddLeadModal({ onClose, onSubmit }) {
  const { theme } = useTenantBranding()
  const [form, setForm] = useState(emptyForm)
  const [vehicles, setVehicles] = useState([])
  const [brands, setBrands] = useState([])
  const [bodyTypes, setBodyTypes] = useState([])
  const [tradeInModels, setTradeInModels] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInventoryVehicles({ pageSize: 'all', status: 'available' })
      .then((data) => setVehicles(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setVehicles([]))
    fetchBrands({ pageSize: 'all' })
      .then((data) => setBrands(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setBrands([]))
    fetchBodyTypes()
      .then((data) => setBodyTypes(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setBodyTypes([]))
  }, [])

  // Trade-in model options depend on the selected trade-in brand — same
  // brand/model catalog ConvertLeadToInventoryModal uses later, so picking
  // here lines up with what staff will confirm at conversion time.
  useEffect(() => {
    setForm((p) => ({ ...p, trade_in_model_id: '' }))
    if (!form.trade_in_brand_id) { setTradeInModels([]); return }
    fetchModels({ brandId: form.trade_in_brand_id, pageSize: 'all' })
      .then((data) => setTradeInModels(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setTradeInModels([]))
  }, [form.trade_in_brand_id])

  const vehicleOptions = vehicles.map((v) => ({ id: v.id, name: `${v.year} ${v.brand_name} ${v.vehicle_model_name}` }))
  const brandOptions = brands.map((b) => ({ id: b.id, name: b.name }))
  const bodyTypeOptions = bodyTypes.map((b) => ({ id: b.id, name: b.name }))
  const tradeInModelOptions = tradeInModels.map((m) => ({ id: m.id, name: m.name }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.')
      return
    }
    if (form.enquiry_type === 'specific_vehicle' && !form.vehicle) {
      setError('Select a vehicle for a specific-vehicle enquiry.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        enquiry_type: form.enquiry_type,
        vehicle: form.enquiry_type === 'specific_vehicle' ? form.vehicle : null,
        preferred_brand: form.enquiry_type === 'general_search' ? (form.preferred_brand || null) : null,
        preferred_vehicle_type: form.enquiry_type === 'general_search' ? (form.preferred_vehicle_type || null) : null,
        budget_min: form.budget_min || null,
        budget_max: form.budget_max || null,
        trade_in_brand: form.enquiry_type === 'trade_in'
          ? (brands.find((b) => String(b.id) === String(form.trade_in_brand_id))?.name || null)
          : null,
        trade_in_model: form.enquiry_type === 'trade_in'
          ? (tradeInModels.find((m) => String(m.id) === String(form.trade_in_model_id))?.name || null)
          : null,
        trade_in_year: form.enquiry_type === 'trade_in' ? (form.trade_in_year || null) : null,
        trade_in_registration_no: form.enquiry_type === 'trade_in' ? (form.trade_in_registration_no.trim() || null) : null,
        trade_in_odometer_km: form.enquiry_type === 'trade_in' ? (form.trade_in_odometer_km || null) : null,
        trade_in_expected_price: form.enquiry_type === 'trade_in' ? (form.trade_in_expected_price || null) : null,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        source: form.source,
        assigned_to: form.assigned_to || null,
        next_follow_up_at: form.next_follow_up_at || null,
        message: form.message.trim() || '',
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create lead.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between p-6 pb-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Lead</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-6 pt-3 space-y-4">
          {error ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

          <div>
            <label className={labelCls}>What are they asking about? *</label>
            <div className="grid grid-cols-3 gap-2">
              {ENQUIRY_TYPE_OPTIONS.map((opt) => {
                const sel = form.enquiry_type === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, enquiry_type: opt.value }))}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                      sel ? 'border-transparent text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}
                    style={sel ? { backgroundColor: theme.accent } : undefined}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {form.enquiry_type === 'specific_vehicle' ? (
            <div>
              <label className={labelCls}>Vehicle *</label>
              <SearchableSelect
                value={form.vehicle}
                options={vehicleOptions}
                onChange={(v) => setForm((p) => ({ ...p, vehicle: v }))}
                placeholder="Select vehicle"
                searchPlaceholder="Search inventory..."
                accent={theme.accent}
                accentSoft={theme.accentSoft}
              />
            </div>
          ) : null}

          {form.enquiry_type === 'general_search' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Preferred Brand</label>
                  <SearchableSelect
                    value={form.preferred_brand}
                    options={brandOptions}
                    onChange={(v) => setForm((p) => ({ ...p, preferred_brand: v }))}
                    placeholder="Any brand"
                    accent={theme.accent}
                    accentSoft={theme.accentSoft}
                  />
                </div>
                <div>
                  <label className={labelCls}>Body Type</label>
                  <SearchableSelect
                    value={form.preferred_vehicle_type}
                    options={bodyTypeOptions}
                    onChange={(v) => setForm((p) => ({ ...p, preferred_vehicle_type: v }))}
                    placeholder="Any body type"
                    accent={theme.accent}
                    accentSoft={theme.accentSoft}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Budget Min (₹)</label>
                  <input type="number" min="0" value={form.budget_min} onChange={(e) => setForm((p) => ({ ...p, budget_min: e.target.value }))} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Budget Max (₹)</label>
                  <input type="number" min="0" value={form.budget_max} onChange={(e) => setForm((p) => ({ ...p, budget_max: e.target.value }))} className={inputCls} placeholder="0" />
                </div>
              </div>
            </>
          ) : null}

          {form.enquiry_type === 'trade_in' ? (
            <>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                What they told you about their own car — not yet a real inventory listing. Once you've appraised it, "Convert to Inventory" on the lead's Manage screen picks the real catalog entries and creates the listing.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Their Vehicle Brand</label>
                  <SearchableSelect
                    value={form.trade_in_brand_id}
                    options={brandOptions}
                    onChange={(v) => setForm((p) => ({ ...p, trade_in_brand_id: v }))}
                    placeholder="Select brand"
                    accent={theme.accent}
                    accentSoft={theme.accentSoft}
                  />
                </div>
                <div>
                  <label className={labelCls}>Their Vehicle Model</label>
                  <SearchableSelect
                    value={form.trade_in_model_id}
                    options={tradeInModelOptions}
                    onChange={(v) => setForm((p) => ({ ...p, trade_in_model_id: v }))}
                    placeholder={form.trade_in_brand_id ? 'Select model' : 'Pick a brand first'}
                    disabled={!form.trade_in_brand_id}
                    accent={theme.accent}
                    accentSoft={theme.accentSoft}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Year</label>
                  <input type="number" value={form.trade_in_year} onChange={(e) => setForm((p) => ({ ...p, trade_in_year: e.target.value }))} className={inputCls} placeholder="2019" />
                </div>
                <div>
                  <label className={labelCls}>Odometer (km)</label>
                  <input type="number" min="0" value={form.trade_in_odometer_km} onChange={(e) => setForm((p) => ({ ...p, trade_in_odometer_km: e.target.value }))} className={inputCls} placeholder="45000" />
                </div>
                <div>
                  <label className={labelCls}>Registration No.</label>
                  <input value={form.trade_in_registration_no} onChange={(e) => setForm((p) => ({ ...p, trade_in_registration_no: e.target.value }))} className={inputCls} placeholder="KA01AB1234" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Their Expected Price (₹)</label>
                <input type="number" min="0" value={form.trade_in_expected_price} onChange={(e) => setForm((p) => ({ ...p, trade_in_expected_price: e.target.value }))} className={inputCls} placeholder="0" />
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Source</label>
              <select value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} className={inputCls}>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Next Follow-up</label>
              <input type="date" value={form.next_follow_up_at} onChange={(e) => setForm((p) => ({ ...p, next_follow_up_at: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <StaffPicker value={form.assigned_to} onChange={(v) => setForm((p) => ({ ...p, assigned_to: v }))} label="Assign to" />

          <div>
            <label className={labelCls}>Message / Notes</label>
            <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} className={`${inputCls} h-20`} placeholder="What did they ask?" />
          </div>
        </form>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>
            {saving ? 'Saving...' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
