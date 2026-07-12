import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, UserPlus, X } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { createCustomer, fetchCities, fetchStates } from '../utils/customers'

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
  imageFile: null,
}

function normalizeText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizePhoneDigits(value) {
  const digits = normalizeText(value).replaceAll(/\D/g, '')
  if (digits.startsWith('91') && digits.length > 10) return digits.slice(-10)
  return digits.slice(0, 10)
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400'
const labelCls = 'mb-1 block text-xs font-semibold text-slate-500'

/**
 * Slide-over drawer for creating a new customer in-context.
 *
 * Props:
 *   open            – boolean, controls visibility
 *   onClose         – () => void
 *   onCustomerCreated – (customer: object) => void  – called with the newly created customer
 */
export default function AddCustomerDrawer({ open, onClose, onCustomerCreated }) {
  const { theme } = useTenantBranding()

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)

  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [locationsLoading, setLocationsLoading] = useState(false)

  const [stateOpen, setStateOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)

  const stateRef = useRef(null)
  const cityRef = useRef(null)

  const selectedState = states.find((s) => String(s.id) === String(form.state))
  const selectedCity = cities.find((c) => String(c.id) === String(form.city))

  useEffect(() => {
    if (!stateOpen && !cityOpen) return undefined
    const handle = (e) => {
      if (stateRef.current && !stateRef.current.contains(e.target)) setStateOpen(false)
      if (cityRef.current && !cityRef.current.contains(e.target)) setCityOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [stateOpen, cityOpen])

  // Load states when drawer opens
  useEffect(() => {
    if (!open) return
    setForm(emptyForm)
    setFormError('')
    setStateOpen(false)
    setCityOpen(false)
    setLocationsLoading(true)
    fetchStates()
      .then((data) => setStates(Array.isArray(data) ? data : []))
      .catch(() => setStates([]))
      .finally(() => setLocationsLoading(false))
  }, [open])

  useEffect(() => {
    if (form.imageFile) {
      const url = URL.createObjectURL(form.imageFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [form.imageFile])

  // Reload cities when state changes
  useEffect(() => {
    if (!open || !form.state) { setCities([]); return }
    fetchCities(form.state)
      .then((data) => {
        const next = Array.isArray(data) ? data : []
        setCities(next)
        if (!next.some((c) => String(c.id) === String(form.city))) {
          setForm((p) => ({ ...p, city: '' }))
        }
      })
      .catch(() => setCities([]))
  }, [form.state, open])

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined
    const handle = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const fullName = normalizeText(form.full_name).trim()
    const phoneDigits = normalizePhoneDigits(form.phone)
    const altPhoneDigits = normalizePhoneDigits(form.alternate_phone)

    if (!fullName) { setFormError('Full name is required.'); return }
    if (phoneDigits.length !== 10) { setFormError('Phone number must be exactly 10 digits.'); return }
    if (altPhoneDigits && altPhoneDigits.length !== 10) { setFormError('Alternate phone must be exactly 10 digits.'); return }

    const gstin = normalizeText(form.gstin).trim().toUpperCase()
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      setFormError('Invalid GSTIN format.'); return
    }

    const payload = {
      full_name: fullName,
      email: normalizeText(form.email).trim() || null,
      phone: `+91${phoneDigits}`,
      alternate_phone: altPhoneDigits ? `+91${altPhoneDigits}` : null,
      status: form.status,
      address: normalizeText(form.address).trim() || null,
      city: form.city || null,
      state: form.state || null,
      postal_code: normalizeText(form.postal_code).trim() || null,
      gstin: gstin || null,
      notes: normalizeText(form.notes).trim() || null,
    }

    let finalPayload = payload
    if (form.imageFile) {
      finalPayload = new FormData()
      Object.entries(payload).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          finalPayload.append(key, val)
        }
      })
      finalPayload.append('photo_file', form.imageFile)
    }

    setSaving(true)
    try {
      const newCustomer = await createCustomer(finalPayload)
      onCustomerCreated(newCustomer)
      onClose()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
      setFormError(err.message || 'Failed to create customer.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-l dark:border-slate-800/60 dark:bg-[#020617] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Add new customer"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800/60 dark:bg-slate-900/20">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.accentSoft }}
            >
              <UserPlus size={16} style={{ color: theme.accent }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Add New Customer</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create and auto-select a customer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 dark:bg-[#020617]">
          <form id="add-customer-drawer-form" onSubmit={handleSubmit} className="space-y-4">
            {formError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
                {formError}
              </div>
            ) : null}

            {/* Section: Basic Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Basic Information</p>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Full Name <span className="text-rose-500">*</span></label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="e.g. Johnathan Doe"
                    className={`${inputCls} dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Phone <span className="text-rose-500">*</span></label>
                    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:focus-within:border-slate-700">
                      <span className="flex items-center border-r border-slate-200 px-2.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">+91</span>
                      <input
                        value={form.phone}
                        maxLength={10}
                        inputMode="numeric"
                        onChange={(e) => setForm((p) => ({ ...p, phone: normalizePhoneDigits(e.target.value) }))}
                        placeholder="10-digit number"
                        className="w-full bg-slate-50 px-2.5 py-2.5 text-sm outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-100 dark:placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Alternate Phone</label>
                    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-slate-400 dark:border-slate-800 dark:bg-slate-950/50 dark:focus-within:border-slate-700">
                      <span className="flex items-center border-r border-slate-200 px-2.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">+91</span>
                      <input
                        value={form.alternate_phone}
                        maxLength={10}
                        inputMode="numeric"
                        onChange={(e) => setForm((p) => ({ ...p, alternate_phone: normalizePhoneDigits(e.target.value) }))}
                        placeholder="Optional"
                        className="w-full bg-slate-50 px-2.5 py-2.5 text-sm outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-100 dark:placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="name@example.com"
                    className={`${inputCls} dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700`}
                  />
                </div>

                <div>
                  <label className={labelCls}>Profile Image</label>
                  <div className="rounded-xl border border-dashed border-slate-300 p-2">
                    {previewUrl && (
                      <div className="mb-2 flex h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                        <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm((p) => ({ ...p, imageFile: e.target.files[0] || null }))}
                      className="w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:outline-none dark:file:bg-slate-800 dark:file:text-slate-300"
                    />
                  </div>
                </div>


              </div>
            </div>

            {/* Section: Location */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Location</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>State</label>
                    <div className="relative" ref={stateRef}>
                      <button
                        type="button"
                        disabled={locationsLoading}
                        onClick={() => { if (locationsLoading) return; setStateOpen((p) => !p) }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
                      >
                        {locationsLoading ? 'Loading…' : selectedState?.name || 'Select state'}
                      </button>
                      <ChevronDown size={15} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${stateOpen ? 'rotate-180' : ''}`} />
                      {stateOpen ? (
                        <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => { setForm((p) => ({ ...p, state: '', city: '' })); setStateOpen(false) }}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!form.state ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                            style={!form.state ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                          >
                            {!form.state ? <Check size={13} /> : <span className="w-[13px]" />}
                            Select state
                          </button>
                          {states.map((s) => {
                            const sel = String(form.state) === String(s.id)
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => { setForm((p) => ({ ...p, state: String(s.id), city: '' })); setStateOpen(false) }}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                              >
                                {sel ? <Check size={13} /> : <span className="w-[13px]" />}
                                {s.name}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>City</label>
                    <div className="relative" ref={cityRef}>
                      <button
                        type="button"
                        disabled={!form.state || locationsLoading}
                        onClick={() => { if (!form.state || locationsLoading) return; setStateOpen(false); setCityOpen((p) => !p) }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
                      >
                        {!form.state ? 'Select state first' : locationsLoading ? 'Loading…' : selectedCity?.name || 'Select city'}
                      </button>
                      <ChevronDown size={15} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${cityOpen ? 'rotate-180' : ''}`} />
                      {cityOpen ? (
                        <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => { setForm((p) => ({ ...p, city: '' })); setCityOpen(false) }}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${!form.city ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                            style={!form.city ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                          >
                            {!form.city ? <Check size={13} /> : <span className="w-[13px]" />}
                            Select city
                          </button>
                          {cities.map((c) => {
                            const sel = String(form.city) === String(c.id)
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { setForm((p) => ({ ...p, city: String(c.id) })); setCityOpen(false) }}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${sel ? 'font-semibold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                style={sel ? { backgroundColor: theme.accentSoft, color: theme.accent } : undefined}
                              >
                                {sel ? <Check size={13} /> : <span className="w-[13px]" />}
                                {c.name}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Postal Code</label>
                  <input
                    value={form.postal_code}
                    onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
                    placeholder="Enter postal code"
                    className={`${inputCls} dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700`}
                  />
                </div>

                <div>
                  <label className={labelCls}>GSTIN</label>
                  <input
                    value={form.gstin}
                    onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    placeholder="Enter GSTIN"
                    maxLength={15}
                    className={`${inputCls} dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700`}
                  />
                </div>

                <div>
                  <label className={labelCls}>Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Enter address"
                    rows={2}
                    className={`${inputCls} resize-none dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700`}
                  />
                </div>
              </div>
            </div>

            {/* Section: Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notes</p>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Add any notes about this customer…"
                rows={3}
                className={`${inputCls} resize-none dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-700`}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800/60 dark:bg-slate-900/20">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-customer-drawer-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            style={{ backgroundColor: theme.accent }}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </>
            ) : (
              <>
                <UserPlus size={15} />
                Create Customer
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
