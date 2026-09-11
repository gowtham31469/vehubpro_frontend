import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Plus, UploadCloud, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchBrands, fetchFuelTypes, fetchModels, fetchVehicleTypes } from '../utils/vehicles'
import {
  createInventoryVehicle,
  fetchInventoryFeatures,
  getInventoryVehicle,
  updateInventoryVehicle,
} from '../utils/inventoryVehicles'

const BODY_TYPE_CODES = new Set(['hatchback', 'sedan', 'suv', 'muv', 'luxury_sedan', 'luxury_suv'])

// A fixed palette, not tenant-managed master data — mirrors
// InventoryVehicle.COLOR_CHOICES in backend/apps/platform/portfolio/models.py.
// Keep the `code`s in sync if that list changes.
const COLOR_OPTIONS = [
  { code: 'yellow', name: 'Yellow', hex: '#FDE94B', light: true },
  { code: 'red', name: 'Red', hex: '#C0392B' },
  { code: 'beige', name: 'Beige', hex: '#D8C7A1', light: true },
  { code: 'purple', name: 'Purple', hex: '#9C3FD4' },
  { code: 'white', name: 'White', hex: '#FFFFFF', light: true },
  { code: 'silver', name: 'Silver', hex: '#C8C8C8', light: true },
  { code: 'gray', name: 'Gray', hex: '#8C8C8C' },
  { code: 'black', name: 'Black', hex: '#1A1A1A' },
  { code: 'blue', name: 'Blue', hex: '#3B6FD4' },
  { code: 'green', name: 'Green', hex: '#4FAE5C' },
  { code: 'orange', name: 'Orange', hex: '#E8912B' },
]

function emptyForm(y0) {
  return {
    vehicle_type: '',
    brand: '',
    vehicle_model: '',
    year: y0,
    fuel_type: '',
    transmission: 'automatic',
    color: '',
    mileage_km: '',
    key_features: [],
    listing_price: '',
    insurance_policy_no: '',
    registration_no: '',
    tax_expiration_date: '',
  }
}

function vehicleToForm(v, y0) {
  return {
    vehicle_type: v.vehicle_type || '',
    brand: v.brand || '',
    vehicle_model: v.vehicle_model || '',
    year: v.year ?? y0,
    fuel_type: v.fuel_type || '',
    transmission: v.transmission || 'automatic',
    color: v.color || '',
    mileage_km: v.mileage_km ?? '',
    key_features: (v.key_features || []).map(String),
    listing_price: v.listing_price ?? '',
    insurance_policy_no: v.insurance_policy_no || '',
    registration_no: v.registration_no || '',
    tax_expiration_date: v.tax_expiration_date || '',
  }
}

function SectionCard({ step, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--step-badge-bg)', color: 'var(--step-badge-fg)' }}
        >
          {step}
        </span>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

export default function AdminInventoryVehicleForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const y0 = new Date().getFullYear()

  const [form, setForm] = useState(emptyForm(y0))
  const [saving, setSaving] = useState(false)
  const [loadingVehicle, setLoadingVehicle] = useState(isEdit)
  const [formError, setFormError] = useState('')

  const [brands, setBrands] = useState([])
  const [modelsForBrand, setModelsForBrand] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [fuelTypes, setFuelTypes] = useState([])
  const [features, setFeatures] = useState([])

  const [existingPhotos, setExistingPhotos] = useState([]) // [{key, url}]
  const [removedPhotoKeys, setRemovedPhotoKeys] = useState([])
  const [newFiles, setNewFiles] = useState([]) // File[]
  const [newPreviews, setNewPreviews] = useState([]) // objectURLs, parallel to newFiles
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchBrands({ page: 1, pageSize: 200, isActive: true })
      .then((data) => setBrands(data?.results || []))
      .catch(() => {})
    fetchVehicleTypes()
      .then((data) => setVehicleTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetchInventoryFeatures({ page: 1, pageSize: 200, isActive: true })
      .then((data) => setFeatures(data?.results || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.brand) { setModelsForBrand([]); return }
    let cancelled = false
    fetchModels({ page: 1, pageSize: 200, brandId: form.brand, isActive: true })
      .then((data) => { if (!cancelled) setModelsForBrand(data.results || []) })
      .catch(() => { if (!cancelled) setModelsForBrand([]) })
    return () => { cancelled = true }
  }, [form.brand])

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    setLoadingVehicle(true)
    getInventoryVehicle(id)
      .then((v) => {
        if (cancelled) return
        setForm(vehicleToForm(v, y0))
        setExistingPhotos(v.photo_urls || [])
      })
      .catch((err) => {
        if (err.message === 'SESSION_EXPIRED') {
          globalThis.location.href = '/admin'
          return
        }
        showToast('error', err.message || 'Unable to load listing.')
      })
      .finally(() => !cancelled && setLoadingVehicle(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f))
    setNewPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [newFiles])

  useEffect(() => {
    fetchFuelTypes().then((data) => setFuelTypes(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const brandOptions = brands.map((b) => ({ id: b.id, name: b.name }))
  const modelOptions = modelsForBrand.map((m) => ({ id: m.id, name: m.name }))
  // Restricted to the seeded body-type codes (see
  // backend/apps/platform/vehicles/migrations/0011_seed_body_type_vehicle_types.py)
  // so every listing lands in one of the buckets the public portfolio's
  // "Browse by Body Type" section actually filters by — the shared VehicleType
  // master also holds generic, non-body types (e.g. "Car", "Bus") used by the
  // service-vehicle form, which would never match any body-type bucket.
  const vehicleTypeOptions = vehicleTypes
    .filter((t) => BODY_TYPE_CODES.has(t.code))
    .map((t) => ({ id: t.id, name: t.name }))
  const fuelTypeOptions = fuelTypes.map((f) => ({ id: f.id, name: f.name }))

  const toggleFeature = (featureId) => {
    const key = String(featureId)
    setForm((p) => ({
      ...p,
      key_features: p.key_features.includes(key)
        ? p.key_features.filter((f) => f !== key)
        : [...p.key_features, key],
    }))
  }

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (files.length) setNewFiles((prev) => [...prev, ...files])
  }

  const removeExistingPhoto = (key) => {
    setExistingPhotos((prev) => prev.filter((p) => p.key !== key))
    setRemovedPhotoKeys((prev) => [...prev, key])
  }

  const removeNewFile = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    if (!form.vehicle_type) {
      setFormError('Body type is required.')
      setSaving(false)
      return
    }
    if (!form.brand) {
      setFormError('Brand is required.')
      setSaving(false)
      return
    }
    if (!form.vehicle_model) {
      setFormError('Model is required.')
      setSaving(false)
      return
    }
    if (!form.fuel_type) {
      setFormError('Fuel type is required.')
      setSaving(false)
      return
    }

    const payload = {
      vehicle_type: form.vehicle_type,
      brand: form.brand,
      vehicle_model: form.vehicle_model,
      year: Number(form.year),
      fuel_type: form.fuel_type,
      transmission: form.transmission,
      color: form.color,
      mileage_km: form.mileage_km === '' ? 0 : Number(form.mileage_km),
      key_features: form.key_features,
      listing_price: form.listing_price === '' ? 0 : Number(form.listing_price),
      insurance_policy_no: form.insurance_policy_no.trim(),
      registration_no: form.registration_no.trim(),
      tax_expiration_date: form.tax_expiration_date || null,
    }
    if (newFiles.length) payload.photo_files = newFiles
    if (removedPhotoKeys.length) payload.remove_photos = removedPhotoKeys

    try {
      if (isEdit) {
        await updateInventoryVehicle(id, payload)
        showToast('success', 'Listing updated successfully.')
      } else {
        await createInventoryVehicle(payload)
        showToast('success', 'Listing published successfully.')
      }
      navigate('/admin/portfolio/inventory')
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setFormError(err.message)
      showToast('error', err.message || 'Failed to save listing.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingVehicle) {
    return (
      <AdminShell activeNav="inventory_vehicles">
        <div className="mx-auto max-w-[900px] py-20 text-center text-slate-500 dark:text-slate-400">Loading…</div>
      </AdminShell>
    )
  }

  return (
    <AdminShell activeNav="inventory_vehicles">
      <div
        className="mx-auto max-w-[900px] space-y-5"
        style={{ '--step-badge-bg': theme.accentSoft, '--step-badge-fg': theme.accent }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Inventory {'>'} {isEdit ? 'Edit Listing' : 'Add New Listing'}
          </p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
            {isEdit ? 'Edit Car Listing' : 'Add New Car Listing'}
          </h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Fill in the technical and commercial details to list a vehicle in your tenant portfolio.
          </p>
        </div>

        {formError ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>
        ) : null}

        <form onSubmit={handleSave} className="space-y-5">
          <SectionCard step={1} title="Basic Information">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={labelCls}>Body Type <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={form.vehicle_type}
                  options={vehicleTypeOptions}
                  onChange={(v) => setForm((p) => ({ ...p, vehicle_type: v }))}
                  placeholder="Select body type"
                  searchPlaceholder="Search body types…"
                  accent={theme.accent}
                  accentSoft={theme.accentSoft}
                />
              </div>
              <div>
                <label className={labelCls}>Brand <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={form.brand}
                  options={brandOptions}
                  onChange={(v) => setForm((p) => ({ ...p, brand: v, vehicle_model: '' }))}
                  placeholder="Select Brand"
                  searchPlaceholder="Search brands…"
                  accent={theme.accent}
                  accentSoft={theme.accentSoft}
                />
              </div>
              <div>
                <label className={labelCls}>Model <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={form.vehicle_model}
                  options={modelOptions}
                  onChange={(v) => setForm((p) => ({ ...p, vehicle_model: v }))}
                  placeholder={form.brand ? 'Select model' : 'Select brand first'}
                  searchPlaceholder="Search models…"
                  disabled={!form.brand}
                  accent={theme.accent}
                  accentSoft={theme.accentSoft}
                />
              </div>
              <div>
                <label className={labelCls}>Year</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls}>Color</label>
              <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map((c) => {
                  const active = form.color === c.code
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, color: p.color === c.code ? '' : c.code }))}
                      className="relative h-12 w-12 rounded-2xl border-2 transition"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: active ? theme.accent : c.code === 'white' ? '#94a3b8' : 'transparent',
                      }}
                      aria-label={c.name}
                      aria-pressed={active}
                      title={c.name}
                    >
                      {/* A border alone reads poorly on light swatches — pair it
                          with a checkmark whose color contrasts the swatch. */}
                      {active ? (
                        <Check
                          size={18}
                          strokeWidth={3}
                          className="absolute inset-0 m-auto"
                          style={{ color: c.light ? '#141414' : '#fff' }}
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard step={2} title="Technical Specifications">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className={labelCls}>Fuel Type <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={form.fuel_type}
                  options={fuelTypeOptions}
                  onChange={(v) => setForm((p) => ({ ...p, fuel_type: v }))}
                  placeholder="Select fuel type"
                  searchPlaceholder="Search fuel types…"
                  accent={theme.accent}
                  accentSoft={theme.accentSoft}
                />
              </div>
              <div>
                <label className={labelCls}>Transmission</label>
                <div className="flex gap-2">
                  {['automatic', 'manual'].map((t) => {
                    const active = form.transmission === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, transmission: t }))}
                        className="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition"
                        style={
                          active
                            ? { backgroundColor: theme.accent, borderColor: theme.accent, color: '#fff' }
                            : { borderColor: 'var(--tw-border-opacity, #e2e8f0)' }
                        }
                      >
                        <span className={active ? '' : 'text-slate-600 dark:text-slate-300'}>{t}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>Mileage (KM)</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50">
                  <input
                    type="number"
                    value={form.mileage_km}
                    onChange={(e) => setForm((p) => ({ ...p, mileage_km: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-100"
                  />
                  <span className="flex items-center border-l border-slate-200 px-3 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">km</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls}>Key Features</label>
              {features.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No key features configured yet. Add some under Configuration {'>'} Key Features.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {features.map((feature) => {
                    const active = form.key_features.includes(String(feature.id))
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => toggleFeature(feature.id)}
                        className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition"
                        style={
                          active
                            ? { borderColor: theme.accent, backgroundColor: theme.accentSoft, color: theme.accent }
                            : undefined
                        }
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? '' : 'border-slate-300 dark:border-slate-600'}`}
                          style={active ? { borderColor: theme.accent, backgroundColor: theme.accent } : undefined}
                        >
                          {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                        </span>
                        <span className={active ? '' : 'text-slate-600 dark:text-slate-300'}>{feature.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard step={3} title="Pricing & Documents">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={labelCls}>Listing Price</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50">
                  <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.listing_price}
                    onChange={(e) => setForm((p) => ({ ...p, listing_price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Insurance Policy No.</label>
                <input
                  value={form.insurance_policy_no}
                  onChange={(e) => setForm((p) => ({ ...p, insurance_policy_no: e.target.value }))}
                  placeholder="POL-998877"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Registration Number</label>
                <input
                  value={form.registration_no}
                  onChange={(e) => setForm((p) => ({ ...p, registration_no: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Tax Expiration Date</label>
                <input
                  type="date"
                  value={form.tax_expiration_date || ''}
                  onChange={(e) => setForm((p) => ({ ...p, tax_expiration_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard step={4} title="Vehicle Media">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragActive ? 'border-slate-400 bg-slate-50 dark:bg-slate-800/40' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
              >
                <UploadCloud size={22} />
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Drag & Drop car photos</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Upload high-resolution images from multiple angles.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
              />
            </div>

            {(existingPhotos.length > 0 || newPreviews.length > 0) ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {existingPhotos.map((p) => (
                  <div key={p.key} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(p.key)}
                      className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {newPreviews.map((url, idx) => (
                  <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 transition hover:border-slate-400 hover:text-slate-500 dark:border-slate-700"
                >
                  <Plus size={20} />
                </button>
              </div>
            ) : null}
          </SectionCard>

          <div className="flex justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/admin/portfolio/inventory')}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400"
            >
              Discard Draft
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
              style={{ backgroundColor: theme.accent }}
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  )
}
