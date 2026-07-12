import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useToast } from '../context/ToastContext.jsx'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import {
  createCustomer,
  deleteCustomer,
  fetchCities,
  fetchCustomers,
  fetchStates,
  updateCustomer,
} from '../utils/customers'

function initials(name) {
  if (!name) return 'NA'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  alternate_phone: '',
  status: 'active',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  gstin: '',
  notes: '',
  photo_url: null,
  imageFile: null,
}

function normalizeText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizePhoneDigits(value) {
  const digits = normalizeText(value).replaceAll(/\D/g, '')
  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(-10)
  }
  return digits.slice(0, 10)
}

export default function AdminCustomers() {
  const { theme } = useTenantBranding()
  const [customersData, setCustomersData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [modalErrorMessage, setModalErrorMessage] = useState('')
  const [isStateOpen, setIsStateOpen] = useState(false)
  const [isCityOpen, setIsCityOpen] = useState(false)
  const [viewCustomer, setViewCustomer] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [locationsLoading, setLocationsLoading] = useState(false)
  const stateDropdownRef = useRef(null)
  const cityDropdownRef = useRef(null)
  const { showToast } = useToast()
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (formData.imageFile) {
      const url = URL.createObjectURL(formData.imageFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (formData.photo_url) {
      setPreviewUrl(formData.photo_url)
    } else {
      setPreviewUrl(null)
    }
  }, [formData.imageFile, formData.photo_url])

  const loadCustomers = async (targetPage = page) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await fetchCustomers({ page: targetPage, pageSize })
      setCustomersData(data)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setErrorMessage(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isStateOpen && !isCityOpen) return undefined

    const handlePointerDown = (event) => {
      const stateRoot = stateDropdownRef.current
      if (stateRoot && !stateRoot.contains(event.target)) setIsStateOpen(false)

      const cityRoot = cityDropdownRef.current
      if (cityRoot && !cityRoot.contains(event.target)) setIsCityOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isStateOpen, isCityOpen])

  const visibleCustomers = useMemo(() => {
    const source = customersData.results || []
    const query = searchText.trim().toLowerCase()
    return source.filter((c) => {
      const matchesSearch =
        !query ||
        c.full_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query)

      return matchesSearch
    })
  }, [customersData.results, searchText])

  const openCreate = () => {
    setEditingCustomer(null)
    setFormData(emptyForm)
    setIsStateOpen(false)
    setIsCityOpen(false)
    setModalErrorMessage('')
    setIsModalOpen(true)
  }

  const openEdit = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      full_name: normalizeText(customer?.full_name),
      email: normalizeText(customer?.email),
      phone: normalizePhoneDigits(customer?.phone),
      alternate_phone: normalizePhoneDigits(customer?.alternate_phone),
      status: customer?.status === 'inactive' ? 'inactive' : 'active',
      address: normalizeText(customer?.address),
      city: normalizeText(customer?.city),
      state: normalizeText(customer?.state),
      postal_code: normalizeText(customer?.postal_code),
      gstin: normalizeText(customer?.gstin),
      notes: normalizeText(customer?.notes),
      photo_url: customer?.photo_url || null,
      imageFile: null,
    })
    setIsStateOpen(false)
    setIsCityOpen(false)
    setModalErrorMessage('')
    setIsModalOpen(true)
  }

  const editCustomerFromDetails = () => {
    if (!viewCustomer) return
    openEdit(viewCustomer)
    setViewCustomer(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setModalErrorMessage('')

    const trimOrEmpty = (value) => normalizeText(value).trim()
    const fullName = trimOrEmpty(formData.full_name)
    const phoneDigits = normalizePhoneDigits(formData.phone)
    const alternatePhoneDigits = normalizePhoneDigits(formData.alternate_phone)

    if (!fullName) {
      setModalErrorMessage('Full name is required.')
      setSaving(false)
      return
    }
    if (phoneDigits.length !== 10) {
      setModalErrorMessage('Phone number must be exactly 10 digits.')
      setSaving(false)
      return
    }

    if (alternatePhoneDigits && alternatePhoneDigits.length !== 10) {
      setModalErrorMessage('Alternate phone must be exactly 10 digits.')
      setSaving(false)
      return
    }

    const gstin = trimOrEmpty(formData.gstin).toUpperCase()
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      setModalErrorMessage('Invalid GSTIN format.')
      setSaving(false)
      return
    }

    const payload = {
      full_name: fullName,
      email: trimOrEmpty(formData.email) || null,
      phone: `+91${phoneDigits}`,
      alternate_phone: alternatePhoneDigits ? `+91${alternatePhoneDigits}` : null,
      status: formData.status,
      address: trimOrEmpty(formData.address) || null,
      city: trimOrEmpty(formData.city) || null,
      state: trimOrEmpty(formData.state) || null,
      postal_code: trimOrEmpty(formData.postal_code) || null,
      gstin: gstin || null,
      notes: trimOrEmpty(formData.notes) || null,
    }

    let finalPayload = payload
    if (formData.imageFile) {
      finalPayload = new FormData()
      Object.entries(payload).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          finalPayload.append(key, val)
        }
      })
      finalPayload.append('photo_file', formData.imageFile)
    }

    try {
      const customerId = editingCustomer?.id
      if (customerId) {
        await updateCustomer(customerId, finalPayload)
        showToast('success', 'Customer updated successfully.')
      } else {
        await createCustomer(finalPayload)
        showToast('success', 'Customer created successfully.')
      }
      setIsModalOpen(false)
      await loadCustomers(page)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setModalErrorMessage(err.message)
      showToast('error', err.message || 'Action failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const openArchiveModal = (customer) => {
    setArchiveTarget(customer)
  }

  const selectedState = states.find((state) => String(state.id) === String(formData.state))
  const selectedCity = cities.find((city) => String(city.id) === String(formData.city))

  const loadLocationOptions = async (stateId = '') => {
    try {
      setLocationsLoading(true)
      const [statesData, citiesData] = await Promise.all([
        fetchStates(),
        fetchCities(stateId || undefined),
      ])
      setStates(Array.isArray(statesData) ? statesData : [])
      setCities(Array.isArray(citiesData) ? citiesData : [])
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', err.message || 'Unable to load states and cities.')
    } finally {
      setLocationsLoading(false)
    }
  }

  useEffect(() => {
    if (!isModalOpen) return
    loadLocationOptions(formData.state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen])

  useEffect(() => {
    if (!isModalOpen) return
    if (!formData.state) {
      setCities([])
      setFormData((prev) => ({ ...prev, city: '' }))
      return
    }
    fetchCities(formData.state)
      .then((data) => {
        const next = Array.isArray(data) ? data : []
        setCities(next)
        if (!next.some((city) => String(city.id) === String(formData.city))) {
          setFormData((prev) => ({ ...prev, city: '' }))
        }
      })
      .catch((err) => {
        if (err.message === 'SESSION_EXPIRED') {
          globalThis.location.href = '/admin'
          return
        }
        showToast('error', err.message || 'Unable to load cities.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.state, isModalOpen])

  const handleArchiveConfirm = async () => {
    if (!archiveTarget?.id) return
    setIsArchiving(true)
    try {
      await deleteCustomer(archiveTarget.id)
      setArchiveTarget(null)
      showToast('success', 'Customer archived successfully.')
      await loadCustomers(page)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setErrorMessage(err.message)
      showToast('error', err.message || 'Unable to archive customer.')
    } finally {
      setIsArchiving(false)
    }
  }

  const handleExport = () => {
    if (visibleCustomers.length === 0) return
    const headers = ['Full Name', 'Phone', 'Email', 'Status', 'City', 'State', 'Postal Code', 'GSTIN']
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = visibleCustomers.map((c) => [
      c.full_name,
      c.phone,
      c.email || '',
      c.status,
      c.city_name || c.city || '',
      c.state_name || c.state || '',
      c.postal_code || '',
      c.gstin || '',
    ])
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `customers_page_${page}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }


  return (
    <>
      <AdminShell activeNav="customers">
          <div className="mx-auto max-w-[1180px] space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Customer Management</h2>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Detailed database of all registered service center clients and their vehicles.</p>
              </div>
              {!isModalOpen ? (
                <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90" style={{ backgroundColor: theme.accent }}>
                  <Plus size={18} /> Add New Customer
                </button>
              ) : null}
            </div>

            {isModalOpen ? (
              <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:p-6">
                {modalErrorMessage ? (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {modalErrorMessage}
                  </div>
                ) : null}

                <div className={`${modalErrorMessage ? 'mt-4' : ''} rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40 md:p-4`}>
                  <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Customer Information</p>
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <div>
                      <label htmlFor="customer_full_name" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name <span className="text-rose-500">*</span></label>
                      <input id="customer_full_name" value={formData.full_name} onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Johnathan Doe" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700" />
                    </div>
                    <div>
                      <label htmlFor="customer_phone" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Phone Number <span className="text-rose-500">*</span></label>
                      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50">
                        <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">+91</span>
                        <input
                          id="customer_phone"
                          value={formData.phone}
                          maxLength={10}
                          inputMode="numeric"
                          onChange={(e) => setFormData((p) => ({ ...p, phone: normalizePhoneDigits(e.target.value) }))}
                          placeholder="Enter 10-digit number"
                          className="w-full bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="customer_email" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
                      <input id="customer_email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="name@example.com" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Profile Image</label>
                      <div className="rounded-xl border border-dashed border-slate-300 p-2 dark:border-slate-700">
                        {previewUrl && (
                          <div className="mb-2 flex h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                            <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFormData((p) => ({ ...p, imageFile: e.target.files[0] || null }))}
                          className="w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="customer_alternate_phone" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Alternate Phone</label>
                      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                        <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">+91</span>
                        <input
                          id="customer_alternate_phone"
                          value={formData.alternate_phone}
                          maxLength={10}
                          inputMode="numeric"
                          onChange={(e) => setFormData((p) => ({ ...p, alternate_phone: normalizePhoneDigits(e.target.value) }))}
                          placeholder="Enter 10-digit number"
                          className="w-full bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="customer_state" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">State</label>
                      <div className="relative" ref={stateDropdownRef}>
                        <button
                          id="customer_state"
                          type="button"
                          disabled={locationsLoading}
                          onClick={() => {
                            if (locationsLoading) return
                            setIsCityOpen(false)
                            setIsStateOpen((prev) => !prev)
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        >
                          {locationsLoading ? 'Loading states...' : selectedState?.name || 'Select state'}
                        </button>
                        <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${isStateOpen ? 'rotate-180' : ''}`} />
                        {isStateOpen ? (
                          <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({ ...p, state: '', city: '' }))
                                setIsStateOpen(false)
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!formData.state ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              style={!formData.state ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                            >
                              {!formData.state ? <Check size={14} /> : <span className="w-[14px]" />}
                              Select state
                            </button>
                            {states.map((state) => {
                              const sel = String(formData.state) === String(state.id)
                              return (
                              <button
                                key={state.id}
                                type="button"
                                onClick={() => {
                                  setFormData((p) => ({ ...p, state: String(state.id), city: '' }))
                                  setIsStateOpen(false)
                                }}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                              >
                                {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                                {state.name}
                              </button>
                            )})}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="customer_city" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">City</label>
                      <div className="relative" ref={cityDropdownRef}>
                        <button
                          id="customer_city"
                          type="button"
                          disabled={!formData.state || locationsLoading}
                          onClick={() => {
                            if (!formData.state || locationsLoading) return
                            setIsStateOpen(false)
                            setIsCityOpen((prev) => !prev)
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-700"
                        >
                          {!formData.state
                            ? 'Select state first'
                            : locationsLoading
                              ? 'Loading cities...'
                              : selectedCity?.name || 'Select city'}
                        </button>
                        <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${isCityOpen ? 'rotate-180' : ''}`} />
                        {isCityOpen ? (
                          <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({ ...p, city: '' }))
                                setIsCityOpen(false)
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!formData.city ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              style={!formData.city ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                            >
                              {!formData.city ? <Check size={14} /> : <span className="w-[14px]" />}
                              Select city
                            </button>
                            {cities.map((city) => {
                              const sel = String(formData.city) === String(city.id)
                              return (
                              <button
                                key={city.id}
                                type="button"
                                onClick={() => {
                                  setFormData((p) => ({ ...p, city: String(city.id) }))
                                  setIsCityOpen(false)
                                }}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                              >
                                {sel ? <Check size={14} /> : <span className="w-[14px]" />}
                                {city.name}
                              </button>
                            )})}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="customer_postal" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Postal Code</label>
                      <input id="customer_postal" value={formData.postal_code} onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))} placeholder="Enter postal code" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="customer_gstin" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">GSTIN</label>
                      <input id="customer_gstin" value={formData.gstin} maxLength={15} onChange={(e) => setFormData((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))} placeholder="Enter GSTIN" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="customer_address" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Address</label>
                      <textarea id="customer_address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} placeholder="Enter address" className="h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="customer_notes" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Notes</label>
                      <textarea id="customer_notes" value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} placeholder="Add notes" className="h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700" />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: theme.accent }}>
                    {saving ? 'Saving...' : editingCustomer ? 'Update' : 'Save'}
                  </button>
                </div>

              </form>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[250px] flex-1">
                      <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search by name, phone, or email..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
                      />
                    </div>
                    <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800">
                      <Download size={16} /> Export
                    </button>
                  </div>
                </div>

                {errorMessage ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{errorMessage}</div> : null}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50/50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                        <tr>
                          <th className="px-6 py-4">Customer Details</th>
                          <th className="px-6 py-4">Contact Number</th>
                          <th className="px-6 py-4">Email Address</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/60">
                        {isLoading ? (
                          <tr><td className="px-6 py-8 text-slate-500" colSpan={5}>Loading customers...</td></tr>
                        ) : visibleCustomers.length === 0 ? (
                          <tr><td className="px-6 py-8 text-slate-500" colSpan={5}>No customers found.</td></tr>
                        ) : (
                          visibleCustomers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {initials(customer.full_name)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{customer.full_name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{customer.phone || '-'}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{customer.email || '-'}</td>

                              <td className="px-6 py-4">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => setViewCustomer(customer)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" title="View details"><Eye size={17} /></button>
                                  <button onClick={() => openEdit(customer)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" title="Edit"><Pencil size={17} /></button>
                                  <button onClick={() => setArchiveTarget(customer)} className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" title="Archive"><Trash2 size={17} /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800/60">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Showing {visibleCustomers.length} of {customersData.count} entries
                    </p>
                    <div className="flex items-center gap-2">
                       <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(page - 1, 1)
                          setPage(next)
                          loadCustomers(next)
                        }}
                        disabled={!customersData.previous}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                      >
                        Prev
                      </button>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-md" style={{ backgroundColor: theme.accent }}>{page}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = page + 1
                          setPage(next)
                          loadCustomers(next)
                        }}
                        disabled={!customersData.next}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
      </AdminShell>
      {archiveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive Customer</h3>
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Close archive modal"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to archive{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{archiveTarget.full_name || 'this customer'}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">You can restore archived customers later from backend if needed.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                disabled={isArchiving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewCustomer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Details</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Overview of selected customer information.</p>
              </div>
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Close details modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">Full Name</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{viewCustomer.full_name || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">Phone</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{viewCustomer.phone || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{viewCustomer.email || '-'}</p>
                </div>

                <div className="rounded-lg bg-white p-3 dark:bg-slate-900 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">Address</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewCustomer.address || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">Location</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {viewCustomer.city_name || '-'} / {viewCustomer.state_name || '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">Postal Code</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{viewCustomer.postal_code || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => editCustomerFromDetails()}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
