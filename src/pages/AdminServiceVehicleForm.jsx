import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, UserPlus } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import AddCustomerDrawer from '../components/AddCustomerDrawer'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchCustomers } from '../utils/customers'
import {
  createServiceVehicle,
  fetchBrands,
  fetchFuelTypes,
  fetchModels,
  fetchVehicleTypes,
  getServiceVehicle,
  updateServiceVehicle,
} from '../utils/vehicles'

function emptyForm(y0) {
  return {
    customer: '',
    registration_no: '',
    vehicle_type: '',
    brand: '',
    vehicle_model: '',
    year: y0,
    fuel_type: '',
    engine_cc: '',
    battery_capacity_kwh: '',
    vin_number: '',
    engine_number: '',
    insurance_expiry: '',
    puc_expiry: '',
    permit_expiry: '',
    fitness_cert_expiry: '',
    no_of_wheels: '',
    load_capacity_kg: '',
    photo_url: null,
    imageFile: null,
  }
}

function vehicleToForm(v, y0) {
  return {
    customer: v.customer || '',
    registration_no: v.registration_no || '',
    vehicle_type: v.vehicle_type || '',
    brand: v.brand || '',
    vehicle_model: v.vehicle_model || '',
    year: v.year ?? y0,
    fuel_type: v.fuel_type || '',
    engine_cc: v.engine_cc ?? '',
    battery_capacity_kwh: v.battery_capacity_kwh ?? '',
    vin_number: v.vin_number || '',
    engine_number: v.engine_number || '',
    insurance_expiry: v.insurance_expiry || '',
    puc_expiry: v.puc_expiry || '',
    permit_expiry: v.permit_expiry || '',
    fitness_cert_expiry: v.fitness_cert_expiry || '',
    no_of_wheels: v.no_of_wheels ?? '',
    load_capacity_kg: v.load_capacity_kg ?? '',
    photo_url: v.photo_url || null,
    imageFile: null,
  }
}

function buildPayload(form) {
  const n = (x) => (x === '' || x === undefined || x === null ? null : x)
  const num = (x) => {
    if (x === '' || x === undefined || x === null) return null
    const v = Number(x)
    return Number.isFinite(v) ? v : null
  }
  return {
    customer: form.customer,
    registration_no: String(form.registration_no || '').trim().toUpperCase(),
    vehicle_type: form.vehicle_type,
    brand: form.brand,
    vehicle_model: form.vehicle_model,
    year: Number(form.year),
    fuel_type: form.fuel_type,
    engine_cc: num(form.engine_cc),
    battery_capacity_kwh: num(form.battery_capacity_kwh),
    vin_number: form.vin_number ? String(form.vin_number).trim().toUpperCase() : null,
    engine_number: form.engine_number ? String(form.engine_number).trim().toUpperCase() : null,
    insurance_expiry: n(form.insurance_expiry),
    puc_expiry: n(form.puc_expiry),
    permit_expiry: n(form.permit_expiry),
    fitness_cert_expiry: n(form.fitness_cert_expiry),
    no_of_wheels: num(form.no_of_wheels),
    load_capacity_kg: num(form.load_capacity_kg),
  }
}

function Dropdown({ label, required, displayValue, placeholder, dropdownKey, activeDropdown, setActiveDropdown, dropdownRef, children }) {
  const isOpen = activeDropdown === dropdownKey
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setActiveDropdown((prev) => (prev === dropdownKey ? null : dropdownKey))}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-700"
        >
          {displayValue || placeholder}
        </button>
        <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
        {isOpen ? (
          <div className="absolute left-0 right-0 z-[60] mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DropdownItem({ selected, onClick, theme, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${selected ? 'font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}
      style={selected ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
    >
      {selected ? <Check size={14} /> : <span className="w-[14px]" />}
      {children}
    </button>
  )
}

export default function AdminServiceVehicleForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const y0 = new Date().getFullYear()

  const { showToast } = useToast()

  const [form, setForm] = useState(emptyForm(y0))
  const [saving, setSaving] = useState(false)
  const [loadingVehicle, setLoadingVehicle] = useState(isEdit)
  const [formError, setFormError] = useState('')

  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (form.imageFile) {
      const url = URL.createObjectURL(form.imageFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (form.photo_url) {
      setPreviewUrl(form.photo_url)
    } else {
      setPreviewUrl(null)
    }
  }, [form.imageFile, form.photo_url])

  const [customers, setCustomers] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [fuelTypes, setFuelTypes] = useState([])
  const [brands, setBrands] = useState([])
  const [modelsForBrand, setModelsForBrand] = useState([])

  const [activeDropdown, setActiveDropdown] = useState(null)
  const customerRef = useRef(null)
  const vehicleTypeRef = useRef(null)
  const fuelTypeRef = useRef(null)
  const brandRef = useRef(null)
  const modelRef = useRef(null)

  const dropdownRefs = useMemo(
    () => ({ customer: customerRef, vehicleType: vehicleTypeRef, fuelType: fuelTypeRef, brand: brandRef, model: modelRef }),
    [],
  )

  const selectedCustomer = useMemo(() => customers.find((c) => String(c.id) === String(form.customer)), [customers, form.customer])
  const selectedVehicleType = useMemo(() => vehicleTypes.find((t) => String(t.id) === String(form.vehicle_type)), [vehicleTypes, form.vehicle_type])
  const selectedFuelType = useMemo(() => fuelTypes.find((t) => String(t.id) === String(form.fuel_type)), [fuelTypes, form.fuel_type])
  const selectedBrand = useMemo(() => brands.find((b) => String(b.id) === String(form.brand)), [brands, form.brand])
  const selectedModel = useMemo(() => modelsForBrand.find((m) => String(m.id) === String(form.vehicle_model)), [modelsForBrand, form.vehicle_model])

  useEffect(() => {
    if (!activeDropdown) return undefined
    const handle = (e) => {
      const ref = dropdownRefs[activeDropdown]
      if (ref?.current && !ref.current.contains(e.target)) setActiveDropdown(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [activeDropdown, dropdownRefs])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [c, vt, ft, b] = await Promise.all([
          fetchCustomers({ page: 1, pageSize: 100 }),
          fetchVehicleTypes(),
          fetchFuelTypes(),
          fetchBrands({ page: 1, pageSize: 100, isActive: true }),
        ])
        if (cancelled) return
        setCustomers(c.results || [])
        setVehicleTypes(Array.isArray(vt) ? vt : [])
        setFuelTypes(Array.isArray(ft) ? ft : [])
        setBrands(b.results || [])
      } catch (e) {
        if (e.message === 'SESSION_EXPIRED') globalThis.location.href = '/admin'
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    setLoadingVehicle(true)
    getServiceVehicle(id)
      .then((v) => { if (!cancelled) { setForm(vehicleToForm(v, y0)); setLoadingVehicle(false) } })
      .catch((e) => {
        if (cancelled) return
        if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
        showToast('error', e.message || 'Failed to load vehicle.')
        setLoadingVehicle(false)
      })
    return () => { cancelled = true }
  }, [id, isEdit, y0])

  useEffect(() => {
    if (!form.brand) { setModelsForBrand([]); return }
    let cancelled = false
    fetchModels({ page: 1, pageSize: 100, brandId: form.brand, isActive: true })
      .then((data) => { if (!cancelled) setModelsForBrand(data.results || []) })
      .catch(() => { if (!cancelled) setModelsForBrand([]) })
    return () => { cancelled = true }
  }, [form.brand])

  const saveVehicle = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.customer || !form.registration_no || !form.vehicle_type || !form.brand || !form.vehicle_model || !form.fuel_type) {
      setFormError('Please fill in customer, registration, type, brand, model, and fuel type.')
      return
    }
    const payloadData = buildPayload(form)
    if (!payloadData.year || payloadData.year < 1980) {
      setFormError('Enter a valid model year (1980 or later).')
      return
    }

    let finalPayload = payloadData
    if (form.imageFile) {
      finalPayload = new FormData()
      Object.entries(payloadData).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          finalPayload.append(key, val)
        }
      })
      finalPayload.append('photo_file', form.imageFile)
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateServiceVehicle(id, finalPayload)
        showToast('success', 'Vehicle updated successfully.')
      } else {
        await createServiceVehicle(finalPayload)
        showToast('success', 'Vehicle registered successfully.')
      }
      navigate('/admin/service-vehicles')
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setFormError(err.message || 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700'
  const labelCls = 'mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400'

  return (
    <>
      <AdminShell activeNav="service-vehicles">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Vehicle' : 'Register Vehicle'}</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">{isEdit ? 'Update the details for this service vehicle.' : 'Register a new customer vehicle for service tracking.'}</p>
          </div>

          {loadingVehicle ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-10 text-sm text-slate-500 dark:text-slate-400 shadow-sm">Loading vehicle…</div>
          ) : (
            <form onSubmit={saveVehicle} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-6">
              {formError ? (
                <div className="mb-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">{formError}</div>
              ) : null}

              {/* Section: Vehicle Information */}
              <div className="relative z-10 rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4">
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Vehicle Information</p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">

                  {/* Customer — full width */}
                  <div className="md:col-span-2">
                    <Dropdown
                      label="Customer" required
                      displayValue={selectedCustomer?.full_name}
                      placeholder="Select customer"
                      dropdownKey="customer"
                      activeDropdown={activeDropdown}
                      setActiveDropdown={setActiveDropdown}
                      dropdownRef={customerRef}
                      theme={theme}
                    >
                      {/* Add new customer shortcut */}
                      <button
                        type="button"
                        onClick={() => { setActiveDropdown(null); setCustomerDrawerOpen(true) }}
                        className="flex w-full items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        style={{ color: theme.accent }}
                      >
                        <UserPlus size={14} />
                        Add new customer
                      </button>
                      <DropdownItem
                        selected={!form.customer}
                        onClick={() => { setForm((p) => ({ ...p, customer: '' })); setActiveDropdown(null) }}
                        theme={theme}
                      >
                        Select customer
                      </DropdownItem>
                      {customers.map((c) => (
                        <DropdownItem
                          key={c.id}
                          selected={String(form.customer) === String(c.id)}
                          onClick={() => { setForm((p) => ({ ...p, customer: String(c.id) })); setActiveDropdown(null) }}
                          theme={theme}
                        >
                          {c.full_name}
                        </DropdownItem>
                      ))}
                    </Dropdown>
                  </div>

                  <div>
                    <label className={labelCls}>Registration No. <span className="text-rose-500">*</span></label>
                    <input
                      required
                      value={form.registration_no}
                      onChange={(e) => setForm((p) => ({ ...p, registration_no: e.target.value }))}
                      placeholder="e.g. MH12AB1234"
                      className={`${inputCls} font-mono`}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Year <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="number"
                      min={1980}
                      max={y0}
                      value={form.year}
                      onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                      placeholder={String(y0)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <Dropdown
                      label="Vehicle Type" required
                      displayValue={selectedVehicleType?.name}
                      placeholder="Select type"
                      dropdownKey="vehicleType"
                      activeDropdown={activeDropdown}
                      setActiveDropdown={setActiveDropdown}
                      dropdownRef={vehicleTypeRef}
                      theme={theme}
                    >
                      <DropdownItem
                        selected={!form.vehicle_type}
                        onClick={() => { setForm((p) => ({ ...p, vehicle_type: '' })); setActiveDropdown(null) }}
                        theme={theme}
                      >
                        Select type
                      </DropdownItem>
                      {vehicleTypes.map((t) => (
                        <DropdownItem
                          key={t.id}
                          selected={String(form.vehicle_type) === String(t.id)}
                          onClick={() => { setForm((p) => ({ ...p, vehicle_type: String(t.id) })); setActiveDropdown(null) }}
                          theme={theme}
                        >
                          {t.name}
                        </DropdownItem>
                      ))}
                    </Dropdown>
                  </div>

                  <div>
                    <Dropdown
                      label="Fuel Type" required
                      displayValue={selectedFuelType?.name}
                      placeholder="Select fuel type"
                      dropdownKey="fuelType"
                      activeDropdown={activeDropdown}
                      setActiveDropdown={setActiveDropdown}
                      dropdownRef={fuelTypeRef}
                      theme={theme}
                    >
                      <DropdownItem
                        selected={!form.fuel_type}
                        onClick={() => { setForm((p) => ({ ...p, fuel_type: '' })); setActiveDropdown(null) }}
                        theme={theme}
                      >
                        Select fuel type
                      </DropdownItem>
                      {fuelTypes.map((t) => (
                        <DropdownItem
                          key={t.id}
                          selected={String(form.fuel_type) === String(t.id)}
                          onClick={() => { setForm((p) => ({ ...p, fuel_type: String(t.id) })); setActiveDropdown(null) }}
                          theme={theme}
                        >
                          {t.name}
                        </DropdownItem>
                      ))}
                    </Dropdown>
                  </div>

                  <div>
                    <Dropdown
                      label="Brand" required
                      displayValue={selectedBrand?.name}
                      placeholder="Select brand"
                      dropdownKey="brand"
                      activeDropdown={activeDropdown}
                      setActiveDropdown={setActiveDropdown}
                      dropdownRef={brandRef}
                      theme={theme}
                    >
                      <DropdownItem
                        selected={!form.brand}
                        onClick={() => { setForm((p) => ({ ...p, brand: '', vehicle_model: '' })); setActiveDropdown(null) }}
                        theme={theme}
                      >
                        Select brand
                      </DropdownItem>
                      {brands.map((b) => (
                        <DropdownItem
                          key={b.id}
                          selected={String(form.brand) === String(b.id)}
                          onClick={() => { setForm((p) => ({ ...p, brand: String(b.id), vehicle_model: '' })); setActiveDropdown(null) }}
                          theme={theme}
                        >
                          {b.name}
                        </DropdownItem>
                      ))}
                    </Dropdown>
                  </div>

                  <div>
                    <label className={labelCls}>Model <span className="text-rose-500">*</span></label>
                    <div className="relative" ref={modelRef}>
                      <button
                        type="button"
                        disabled={!form.brand}
                        onClick={() => form.brand && setActiveDropdown((prev) => (prev === 'model' ? null : 'model'))}
                        className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium outline-none transition hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 ${form.brand ? 'text-slate-700 dark:text-slate-100' : 'cursor-not-allowed text-slate-400 dark:text-slate-600 opacity-60'}`}
                      >
                        {form.brand ? (selectedModel?.name || 'Select model') : 'Select brand first'}
                      </button>
                      <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${activeDropdown === 'model' ? 'rotate-180' : ''}`} />
                      {activeDropdown === 'model' && form.brand ? (
                        <div className="absolute left-0 right-0 z-[60] mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
                          <DropdownItem
                            selected={!form.vehicle_model}
                            onClick={() => { setForm((p) => ({ ...p, vehicle_model: '' })); setActiveDropdown(null) }}
                            theme={theme}
                          >
                            Select model
                          </DropdownItem>
                          {modelsForBrand.map((m) => (
                            <DropdownItem
                              key={m.id}
                              selected={String(form.vehicle_model) === String(m.id)}
                              onClick={() => { setForm((p) => ({ ...p, vehicle_model: String(m.id) })); setActiveDropdown(null) }}
                              theme={theme}
                            >
                              {m.name}
                            </DropdownItem>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                </div>
              </div>

              {/* Section: Specifications */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4">
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Specifications</p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Engine (cc)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.engine_cc}
                      onChange={(e) => setForm((p) => ({ ...p, engine_cc: e.target.value }))}
                      placeholder="e.g. 1500"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Battery (kWh)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.battery_capacity_kwh}
                      onChange={(e) => setForm((p) => ({ ...p, battery_capacity_kwh: e.target.value }))}
                      placeholder="e.g. 40.5"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>VIN (17 chars)</label>
                    <input
                      maxLength={17}
                      value={form.vin_number}
                      onChange={(e) => setForm((p) => ({ ...p, vin_number: e.target.value }))}
                      placeholder="17-character VIN"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Engine Number</label>
                    <input
                      maxLength={50}
                      value={form.engine_number}
                      onChange={(e) => setForm((p) => ({ ...p, engine_number: e.target.value.toUpperCase() }))}
                      placeholder="Engine number"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Wheels</label>
                    <input
                      type="number"
                      min={2}
                      value={form.no_of_wheels}
                      onChange={(e) => setForm((p) => ({ ...p, no_of_wheels: e.target.value }))}
                      placeholder="e.g. 4"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Load Capacity (kg)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.load_capacity_kg}
                      onChange={(e) => setForm((p) => ({ ...p, load_capacity_kg: e.target.value }))}
                      placeholder="e.g. 1000"
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Vehicle Image</label>
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-2">
                      {previewUrl && (
                        <div className="mb-2 flex h-48 w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setForm((p) => ({ ...p, imageFile: e.target.files[0] || null }))}
                        className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Expiry Dates */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4">
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Expiry Dates</p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Insurance Expiry</label>
                    <input
                      type="date"
                      value={form.insurance_expiry}
                      onChange={(e) => setForm((p) => ({ ...p, insurance_expiry: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>PUC Expiry</label>
                    <input
                      type="date"
                      value={form.puc_expiry}
                      onChange={(e) => setForm((p) => ({ ...p, puc_expiry: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Permit Expiry</label>
                    <input
                      type="date"
                      value={form.permit_expiry}
                      onChange={(e) => setForm((p) => ({ ...p, permit_expiry: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fitness Expiry</label>
                    <input
                      type="date"
                      value={form.fitness_cert_expiry}
                      onChange={(e) => setForm((p) => ({ ...p, fitness_cert_expiry: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/service-vehicles')}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: theme.accent }}
                >
                  {saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </AdminShell>

      <AddCustomerDrawer
        open={customerDrawerOpen}
        onClose={() => setCustomerDrawerOpen(false)}
        onCustomerCreated={(newCustomer) => {
          setCustomers((prev) => [newCustomer, ...prev])
          setForm((p) => ({ ...p, customer: String(newCustomer.id) }))
          showToast('success', `Customer "${newCustomer.full_name}" created successfully.`)
        }}
      />
    </>
  )
}
