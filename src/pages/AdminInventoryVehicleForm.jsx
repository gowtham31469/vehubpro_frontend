import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Plus, Star, UploadCloud, X } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchBodyTypes, fetchBrands, fetchFuelTypes, fetchModels } from '../utils/vehicles'
import {
  createInventoryVehicle,
  fetchInventoryFeatures,
  getInventoryVehicle,
  updateInventoryVehicle,
} from '../utils/inventoryVehicles'

// Mirrors InventoryFeature.CATEGORY_CHOICES in backend/apps/platform/portfolio/models.py
// (also duplicated in AdminConfiguration.jsx) — order here is the display order below.
const FEATURE_CATEGORY_ORDER = [
  { value: 'comfort_convenience', label: 'Comfort & Convenience' },
  { value: 'safety', label: 'Safety' },
  { value: 'entertainment_communication', label: 'Entertainment & Communication' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
]

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
    original_price: '',
    offer_valid_until: '',
    is_featured: false,
    reasons_to_buy: [],
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
    original_price: v.original_price ?? '',
    offer_valid_until: v.offer_valid_until || '',
    is_featured: Boolean(v.is_featured),
    reasons_to_buy: Array.isArray(v.reasons_to_buy) ? v.reasons_to_buy : [],
    insurance_policy_no: v.insurance_policy_no || '',
    registration_no: v.registration_no || '',
    tax_expiration_date: v.tax_expiration_date || '',
  }
}

function FeatureCheckboxGrid({ features, selectedIds, onToggle, theme }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {features.map((feature) => {
        const active = selectedIds.includes(String(feature.id))
        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onToggle(feature.id)}
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
  )
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
  const [bodyTypes, setBodyTypes] = useState([])
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
    fetchBodyTypes()
      .then((data) => setBodyTypes(Array.isArray(data) ? data : []))
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
  const bodyTypeOptions = bodyTypes.map((t) => ({ id: t.id, name: t.name }))
  const fuelTypeOptions = fuelTypes.map((f) => ({ id: f.id, name: f.name }))
  const featureGroups = FEATURE_CATEGORY_ORDER
    .map((cat) => ({ ...cat, features: features.filter((f) => f.category === cat.value) }))
    .filter((group) => group.features.length > 0)

  const toggleFeature = (featureId) => {
    const key = String(featureId)
    setForm((p) => ({
      ...p,
      key_features: p.key_features.includes(key)
        ? p.key_features.filter((f) => f !== key)
        : [...p.key_features, key],
    }))
  }

  const MAX_REASONS = 6

  const addReason = () => {
    setForm((p) => (
      p.reasons_to_buy.length >= MAX_REASONS
        ? p
        : { ...p, reasons_to_buy: [...p.reasons_to_buy, { title: '', description: '' }] }
    ))
  }
  const updateReason = (index, field, value) => {
    setForm((p) => ({
      ...p,
      reasons_to_buy: p.reasons_to_buy.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }))
  }
  const removeReason = (index) => {
    setForm((p) => ({ ...p, reasons_to_buy: p.reasons_to_buy.filter((_, i) => i !== index) }))
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

  // AdminShell renders page content inside a scrollable <main>, not the
  // window itself — window.scrollTo has no effect here.
  const scrollToTop = () => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const failWith = (message) => {
    setFormError(message)
    setSaving(false)
    // The form is long — an error near the top can go unseen if the user is
    // scrolled down near the submit buttons, so bring it into view.
    scrollToTop()
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    if (!form.vehicle_type) {
      failWith('Body type is required.')
      return
    }
    if (!form.brand) {
      failWith('Brand is required.')
      return
    }
    if (!form.vehicle_model) {
      failWith('Model is required.')
      return
    }
    if (!form.fuel_type) {
      failWith('Fuel type is required.')
      return
    }
    if (form.original_price !== '' && Number(form.original_price) <= Number(form.listing_price || 0)) {
      failWith('Original price must be greater than the listing price for a discount to apply.')
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
      original_price: form.original_price === '' ? null : Number(form.original_price),
      offer_valid_until: form.offer_valid_until || null,
      is_featured: form.is_featured,
      reasons_to_buy: form.reasons_to_buy
        .map((r) => ({ title: (r.title || '').trim(), description: (r.description || '').trim() }))
        .filter((r) => r.title),
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
      scrollToTop()
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
                  options={bodyTypeOptions}
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

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, is_featured: !p.is_featured }))}
                className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition"
                style={
                  form.is_featured
                    ? { borderColor: theme.accent, backgroundColor: theme.accentSoft }
                    : undefined
                }
              >
                <Star
                  size={18}
                  className="shrink-0"
                  style={{ color: form.is_featured ? theme.accent : '#94a3b8' }}
                  fill={form.is_featured ? theme.accent : 'none'}
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Featured on homepage</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Only vehicles flagged here appear in the public homepage's "Featured Cars" section.
                  </span>
                </span>
              </button>
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
                <label className={labelCls}>Kms Driven</label>
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

            <div className="mt-4 space-y-4">
              <label className={labelCls}>Safety & Features</label>
              {features.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No key features configured yet. Add some under Configuration {'>'} Key Features.
                </p>
              ) : (
                <>
                  {featureGroups.map((group) => (
                    <div key={group.value}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{group.label}</p>
                      <FeatureCheckboxGrid
                        features={group.features}
                        selectedIds={form.key_features}
                        onToggle={toggleFeature}
                        theme={theme}
                      />
                    </div>
                  ))}
                </>
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
                <label className={labelCls}>Original Price (MRP) — optional</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50">
                  <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) => setForm((p) => ({ ...p, original_price: e.target.value }))}
                    placeholder="Leave blank for no discount"
                    className="w-full bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-100"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  When set with an offer end date, the public listing shows this struck through with a discount badge.
                </p>
              </div>
              <div>
                <label className={labelCls}>Offer Valid Until — optional</label>
                <input
                  type="date"
                  value={form.offer_valid_until || ''}
                  onChange={(e) => setForm((p) => ({ ...p, offer_valid_until: e.target.value }))}
                  className={inputCls}
                />
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

          <SectionCard step={4} title="Reasons to Buy">
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Short marketing highlights shown on this listing's detail page (e.g. "3 new tyres" — "New tyres for a reduced ownership cost"). Optional, up to {MAX_REASONS}.
            </p>
            <div className="space-y-3">
              {form.reasons_to_buy.map((reason, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex-1 space-y-2">
                    <input
                      value={reason.title}
                      onChange={(e) => updateReason(i, 'title', e.target.value)}
                      placeholder="Title, e.g. 3 new tyres"
                      maxLength={100}
                      className={inputCls}
                    />
                    <input
                      value={reason.description}
                      onChange={(e) => updateReason(i, 'description', e.target.value)}
                      placeholder="Description, e.g. New tyres for a reduced ownership cost"
                      maxLength={200}
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReason(i)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-slate-800"
                    aria-label="Remove reason"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            {form.reasons_to_buy.length < MAX_REASONS ? (
              <button
                type="button"
                onClick={addReason}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <Plus size={15} /> Add reason
              </button>
            ) : null}
          </SectionCard>

          <SectionCard step={5} title="Vehicle Media">
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
