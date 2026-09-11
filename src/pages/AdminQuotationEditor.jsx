import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Trash2 } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import SearchableSelect from '../components/SearchableSelect'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchCustomers } from '../utils/customers'
import { fetchServiceItems } from '../utils/services'
import { fetchServiceVehicles } from '../utils/vehicles'
import { createQuotation, getQuotation, patchQuotation, sendQuotation } from '../utils/quotations'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

let rowSeq = 0
function newRow() {
  rowSeq += 1
  return {
    key: `new-${rowSeq}`,
    service_item: '',
    description: '',
    detail_text: '',
    quantity: '1',
    unit_price: '0',
    discount_amount: '0',
  }
}

function emptyForm() {
  return {
    customer: '',
    vehicle: '',
    quotation_date: new Date().toISOString().slice(0, 10),
    valid_until: '',
    notes: '',
    terms_and_conditions: '',
    discount_amount: '0',
    line_items: [],
  }
}

/** Reverse-extract the taxable value from a GST-inclusive gross amount. */
function reverseGstTaxableAmount(grossAmount, gstPercent) {
  if (!(gstPercent > 0)) return grossAmount
  return round2(grossAmount / (1 + gstPercent / 100))
}

/** Client-side preview only — the backend always recomputes and is authoritative. */
function computePreview(form, serviceItems) {
  const rows = form.line_items.filter((r) => (r.description || '').trim() || r.service_item)
  const discount = Math.max(0, Number(form.discount_amount) || 0)

  // Gross amount actually charged per line, before separating out any
  // GST already baked into an inclusive-priced catalog item.
  const lineGross = rows.map((r) => {
    const qty = Number(r.quantity) || 0
    const up = Number(r.unit_price) || 0
    const da = Number(r.discount_amount) || 0
    return Math.max(0, round2(qty * up - da))
  })
  const gstRates = rows.map((r) => {
    const item = serviceItems.find((s) => s.id === r.service_item)
    return item ? Number(item.gst_percentage) || 0 : 0
  })
  // Taxable (pre-tax) value per line — inclusive lines reverse-extract the
  // baked-in tax; exclusive/custom lines are unchanged.
  const lineNets = rows.map((r, i) => {
    const item = serviceItems.find((s) => s.id === r.service_item)
    return item && item.price_type === 'inclusive'
      ? reverseGstTaxableAmount(lineGross[i], gstRates[i])
      : lineGross[i]
  })
  const sub = round2(lineNets.reduce((a, b) => a + b, 0))
  const taxable = Math.max(0, round2(sub - discount))

  let cgst = 0
  let sgst = 0
  const weightSum = lineNets.reduce((a, b) => a + b, 0)
  const taxByKey = new Map()
  rows.forEach((r, i) => {
    const share = weightSum > 0 ? (lineNets[i] / weightSum) * taxable : 0
    const lineTax = round2(share * (gstRates[i] / 100))
    const half = round2(lineTax / 2)
    cgst = round2(cgst + half)
    sgst = round2(sgst + (lineTax - half))
    taxByKey.set(r.key, lineTax)
  })
  const taxTotal = round2(cgst + sgst)
  const total = round2(taxable + cgst + sgst)
  const roundedTotal = Math.round(total)
  const roundOff = round2(roundedTotal - total)

  return { sub, discount, taxable, cgst, sgst, taxTotal, total, roundedTotal, roundOff, taxByKey }
}

export default function AdminQuotationEditor() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [header, setHeader] = useState(null)
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [serviceItems, setServiceItems] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceComboOpen, setServiceComboOpen] = useState(false)
  const [serviceComboError, setServiceComboError] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const serviceComboRef = useRef(null)
  const serviceInputRef = useRef(null)
  const serviceDropdownRef = useRef(null)

  useEffect(() => {
    fetchCustomers({ pageSize: 'all' }).then((d) => setCustomers(d.results || [])).catch(() => {})
    fetchServiceVehicles({ pageSize: 'all' }).then((d) => setVehicles(d.results || [])).catch(() => {})
    fetchServiceItems({ pageSize: 'all', isActive: true }).then((d) => setServiceItems(d.results || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    getQuotation(id)
      .then((q) => {
        setHeader(q)
        setForm({
          customer: q.customer,
          vehicle: q.vehicle,
          quotation_date: q.quotation_date,
          valid_until: q.valid_until || '',
          notes: q.notes || '',
          terms_and_conditions: q.terms_and_conditions || '',
          discount_amount: String(q.discount_amount || 0),
          line_items: (q.line_items || []).map((li) => ({
            key: li.id,
            service_item: li.service_item || '',
            description: li.description,
            detail_text: li.detail_text || '',
            quantity: String(li.quantity),
            unit_price: String(li.unit_price),
            discount_amount: String(li.discount_amount || 0),
          })),
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const isLocked = !isNew && header && header.status !== 'draft'

  const customerVehicles = useMemo(
    () => vehicles.filter((v) => String(v.customer ?? v.customer_id) === String(form.customer)),
    [vehicles, form.customer],
  )

  const customerOptions = useMemo(
    () => customers.map((c) => ({ id: c.id, name: `${c.full_name} — ${c.phone}` })),
    [customers],
  )
  const vehicleOptions = useMemo(
    () => customerVehicles.map((v) => ({ id: v.id, name: `${v.registration_no} · ${v.brand_name || ''} ${v.vehicle_model_name || ''}`.trim() })),
    [customerVehicles],
  )
  const preview = useMemo(() => computePreview(form, serviceItems), [form, serviceItems])

  const updateRow = useCallback((key, patch) => {
    setForm((p) => ({
      ...p,
      line_items: p.line_items.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }))
  }, [])

  const removeRow = useCallback((key) => {
    setForm((p) => ({ ...p, line_items: p.line_items.filter((r) => r.key !== key) }))
  }, [])

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    if (!q) return serviceItems
    return serviceItems.filter(
      (s) => (s.name || '').toLowerCase().includes(q) || (s.category_name || '').toLowerCase().includes(q),
    )
  }, [serviceItems, serviceSearch])

  // Close the combo on outside click — the dropdown is portaled to document.body,
  // so it must be checked separately from the input's own wrapper.
  useEffect(() => {
    if (!serviceComboOpen) return undefined
    const handlePointerDown = (event) => {
      if (serviceComboRef.current && serviceComboRef.current.contains(event.target)) return
      if (serviceDropdownRef.current && serviceDropdownRef.current.contains(event.target)) return
      setServiceComboOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [serviceComboOpen])

  // Position the portaled dropdown against the search input's live screen
  // coordinates, recalculated on scroll/resize (see SearchableSelect for why
  // plain CSS-absolute positioning doesn't work reliably here).
  useEffect(() => {
    if (!serviceComboOpen || !serviceInputRef.current) return undefined
    const updatePosition = () => {
      if (!serviceInputRef.current) return
      const rect = serviceInputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition, { passive: true })
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [serviceComboOpen])

  const addServiceFromCombo = useCallback(() => {
    const svc = serviceItems.find((s) => s.name === serviceSearch.trim())
    if (!svc) {
      setServiceComboError('Select a service from the list.')
      return
    }
    if (form.line_items.some((r) => r.service_item === svc.id)) {
      setServiceComboError(`"${svc.name}" is already added.`)
      setServiceSearch('')
      setServiceComboOpen(false)
      return
    }
    const row = newRow()
    row.service_item = svc.id
    row.description = svc.name || ''
    row.detail_text = (svc.description || '').trim().slice(0, 500)
    row.unit_price = String(svc.base_price ?? 0)
    setForm((p) => ({
      ...p,
      line_items: [...p.line_items.filter((r) => (r.description || '').trim() || r.service_item), row],
    }))
    setServiceSearch('')
    setServiceComboError('')
    setServiceComboOpen(false)
  }, [form.line_items, serviceItems, serviceSearch])

  const buildPayload = useCallback(() => ({
    customer: form.customer,
    vehicle: form.vehicle,
    quotation_date: form.quotation_date,
    valid_until: form.valid_until || null,
    notes: form.notes,
    terms_and_conditions: form.terms_and_conditions,
    discount_amount: form.discount_amount,
    line_items: form.line_items
      .filter((r) => (r.description || '').trim() || r.service_item)
      .map((r, idx) => ({
        sort_order: idx,
        service_item: r.service_item || null,
        description: r.description,
        detail_text: r.detail_text,
        quantity: r.quantity,
        unit_price: r.unit_price,
        discount_amount: r.discount_amount,
      })),
  }), [form])

  const handleSaveDraft = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      const payload = buildPayload()
      const saved = isNew ? await createQuotation(payload) : await patchQuotation(id, payload)
      showToast('success', 'Quotation saved.')
      if (isNew) navigate(`/admin/quotations/${saved.id}`, { replace: true })
      else setHeader(saved)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [buildPayload, id, isNew, navigate, showToast])

  const handleSaveAndSend = useCallback(async () => {
    setSending(true)
    setError('')
    try {
      const payload = buildPayload()
      const saved = isNew ? await createQuotation(payload) : await patchQuotation(id, payload)
      await sendQuotation(saved.id)
      showToast('success', 'Quotation sent.')
      navigate(`/admin/quotations/${saved.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }, [buildPayload, id, isNew, navigate, showToast])

  if (loading) {
    return (
      <AdminShell activeNav="quotations">
        <div className="mx-auto max-w-6xl px-3 py-10 text-center text-slate-500 dark:text-slate-400">Loading…</div>
      </AdminShell>
    )
  }

  return (
    <AdminShell activeNav="quotations">
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-4 md:px-4">

        <Link to="/admin/quotations" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft size={16} /> Quotations
        </Link>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isNew ? 'New Quotation' : `${header?.quotation_number} (v${header?.version})`}
          </h1>
        </div>

        {isLocked ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200/80">
            This quotation is <strong>{header.status}</strong> and can no longer be edited directly. Go to the{' '}
            <Link to={`/admin/quotations/${id}`} className="underline">quotation detail page</Link> to create a revision instead.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">

            {/* Customer / Vehicle */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-800/60 dark:bg-slate-900/40">
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Customer &amp; Vehicle</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</label>
                  <div className="mt-1.5">
                    <SearchableSelect
                      value={form.customer}
                      options={customerOptions}
                      onChange={(v) => setForm((p) => ({ ...p, customer: v, vehicle: '' }))}
                      placeholder="Select customer…"
                      searchPlaceholder="Search by name or phone…"
                      disabled={isLocked}
                      accent={theme.accent}
                      accentSoft={theme.accentSoft}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vehicle</label>
                  <div className="mt-1.5">
                    <SearchableSelect
                      value={form.vehicle}
                      options={vehicleOptions}
                      onChange={(v) => setForm((p) => ({ ...p, vehicle: v }))}
                      placeholder="Select vehicle…"
                      searchPlaceholder="Search by plate, brand, model…"
                      disabled={isLocked || !form.customer}
                      accent={theme.accent}
                      accentSoft={theme.accentSoft}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quotation Date</label>
                  <input
                    type="date"
                    value={form.quotation_date}
                    disabled={isLocked}
                    onChange={(e) => setForm((p) => ({ ...p, quotation_date: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valid Until</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    disabled={isLocked}
                    onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </section>

            {/* Add services — the only way to add a line item; picking an
                already-added catalog item is rejected instead of silently
                creating a duplicate row. */}
            {!isLocked && (
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-800/60 dark:bg-slate-900/40">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add services</h2>
                <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div ref={serviceComboRef} className="relative min-w-0 flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
                    <input
                      ref={serviceInputRef}
                      value={serviceSearch}
                      onChange={(e) => {
                        setServiceSearch(e.target.value)
                        setServiceComboOpen(true)
                        setServiceComboError('')
                      }}
                      onFocus={() => {
                        setServiceComboOpen(true)
                        setServiceComboError('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setServiceComboOpen(false)
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          addServiceFromCombo()
                        }
                      }}
                      placeholder="Search for a predefined service…"
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700"
                    />
                    {serviceComboOpen
                      ? ReactDOM.createPortal(
                          <div
                            ref={serviceDropdownRef}
                            className="fixed z-[9999] max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90"
                            style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px`, width: `${dropdownPos.width}px` }}
                          >
                            {filteredServices.length === 0 ? (
                              <p className="px-4 py-4 text-center text-xs text-slate-400">
                                {serviceSearch.trim() ? `No matches for "${serviceSearch.trim()}"` : 'No services in catalog'}
                              </p>
                            ) : (
                              filteredServices.map((s) => {
                                const alreadyAdded = form.line_items.some((r) => r.service_item === s.id)
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    disabled={alreadyAdded}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setServiceSearch(s.name || '')
                                      setServiceComboOpen(false)
                                      setServiceComboError('')
                                    }}
                                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800/50"
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                                      {s.category_name ? (
                                        <span className="block text-xs text-slate-400 dark:text-slate-500">{s.category_name}</span>
                                      ) : null}
                                    </span>
                                    <span className="shrink-0 text-right text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300">
                                      {alreadyAdded ? 'Added' : fmtMoney(s.base_price)}
                                    </span>
                                  </button>
                                )
                              })
                            )}
                          </div>,
                          document.body,
                        )
                      : null}
                    {serviceComboError ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400" role="status">
                        {serviceComboError}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => addServiceFromCombo()}
                    disabled={!serviceSearch.trim() || !filteredServices.some((s) => s.name === serviceSearch)}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-95"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Plus size={16} strokeWidth={2.25} aria-hidden />
                    Add service
                  </button>
                </div>
              </section>
            )}

            {/* Line items */}
            {form.line_items.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4 text-[10px] tracking-widest">Service</th>
                      <th className="px-5 py-4 text-right text-[10px] tracking-widest">Qty</th>
                      <th className="px-5 py-4 text-right text-[10px] tracking-widest">Unit price</th>
                      <th className="px-5 py-4 text-right text-[10px] tracking-widest">Discount</th>
                      <th className="px-5 py-4 text-right text-[10px] tracking-widest">GST</th>
                      <th className="px-5 py-4 text-right text-[10px] tracking-widest">Total</th>
                      <th className="px-5 py-4 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {form.line_items.map((row) => {
                      const catalogItem = serviceItems.find((s) => s.id === row.service_item)
                      const qty = Number(row.quantity) || 0
                      const unitPrice = Number(row.unit_price) || 0
                      const lineDiscount = Number(row.discount_amount) || 0
                      const lineGross = Math.max(0, round2(qty * unitPrice - lineDiscount))
                      const tax = preview.taxByKey.get(row.key) ?? 0
                      const inclusive = catalogItem?.price_type === 'inclusive'
                      // GST-inclusive lines already have tax baked into lineGross —
                      // adding the breakdown on top again would double-count it.
                      const lineTotal = inclusive ? lineGross : lineGross + tax
                      const isDraft = !(row.description || '').trim() && !row.service_item
                      return (
                        <tr
                          key={row.key}
                          className={`align-top transition-colors ${isDraft ? 'bg-amber-50/35 dark:bg-amber-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                        >
                          <td className="min-w-[240px] px-5 py-4">
                            <input
                              value={row.description}
                              disabled={isLocked}
                              onChange={(e) => updateRow(row.key, { description: e.target.value })}
                              placeholder="Service name"
                              className="w-full min-w-[160px] border-0 bg-transparent p-0 text-sm font-bold text-slate-900 outline-none focus:ring-0 dark:text-slate-100 disabled:opacity-50"
                            />
                            <input
                              value={row.detail_text}
                              disabled={isLocked}
                              onChange={(e) => updateRow(row.key, { detail_text: e.target.value })}
                              placeholder="Detail / spec (optional)"
                              className="mt-1 w-full min-w-[160px] border-0 bg-transparent p-0 text-xs text-slate-500 outline-none focus:ring-0 dark:text-slate-400 disabled:opacity-50"
                            />
                            {catalogItem?.category_name ? (
                              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                {catalogItem.category_name}
                                {inclusive && (
                                  <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    incl. GST
                                  </span>
                                )}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <input
                              type="number" min="0" step="0.001"
                              value={row.quantity}
                              disabled={isLocked}
                              onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                            />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <input
                              type="number" min="0" step="0.01"
                              value={row.unit_price}
                              disabled={isLocked}
                              onChange={(e) => updateRow(row.key, { unit_price: e.target.value })}
                              className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                            />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <input
                              type="number" min="0" step="0.01"
                              value={row.discount_amount}
                              disabled={isLocked}
                              onChange={(e) => updateRow(row.key, { discount_amount: e.target.value })}
                              className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                            />
                          </td>
                          <td className="px-5 py-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            {fmtMoney(tax)}
                            {catalogItem ? (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{Number(catalogItem.gst_percentage) || 0}%</p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                            {fmtMoney(lineTotal)}
                          </td>
                          <td className="px-5 py-4">
                            {!isLocked && (
                              <button
                                type="button"
                                aria-label="Remove line"
                                onClick={() => removeRow(row.key)}
                                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            )}

            {/* Notes / Terms */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-800/60 dark:bg-slate-900/40">
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Notes &amp; Terms</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notes</label>
                  <textarea
                    value={form.notes}
                    disabled={isLocked}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Terms &amp; Conditions <span className="normal-case text-slate-400">(leave blank to use the tenant's standard terms)</span>
                  </label>
                  <textarea
                    value={form.terms_and_conditions}
                    disabled={isLocked}
                    onChange={(e) => setForm((p) => ({ ...p, terms_and_conditions: e.target.value }))}
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Financial summary sidebar — same structure as the job card editor's panel */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Financial summary</h2>

              <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Adjustments</p>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm text-slate-600 dark:text-slate-300">Discount (₹)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.discount_amount}
                    disabled={isLocked}
                    onChange={(e) => setForm((p) => ({ ...p, discount_amount: e.target.value }))}
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Subtotal</dt>
                  <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmtMoney(preview.sub)}</dd>
                </div>
                {preview.discount > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Discount</dt>
                    <dd className="font-bold tabular-nums text-rose-600 dark:text-rose-500">−{fmtMoney(preview.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Taxable</dt>
                  <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmtMoney(preview.taxable)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">CGST</dt>
                  <dd className="tabular-nums text-slate-700 dark:text-slate-300">{fmtMoney(preview.cgst)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">SGST</dt>
                  <dd className="tabular-nums text-slate-700 dark:text-slate-300">{fmtMoney(preview.sgst)}</dd>
                </div>
                <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                  <dt className="text-slate-500 dark:text-slate-400">Total GST</dt>
                  <dd className="font-medium tabular-nums">{fmtMoney(preview.taxTotal)}</dd>
                </div>
                {preview.roundOff !== 0 && (
                  <div className="flex justify-between gap-2 border-t border-slate-100 pt-3 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    <dt className="text-slate-500 dark:text-slate-400">Round off</dt>
                    <dd className="tabular-nums text-slate-700 dark:text-slate-300">
                      {preview.roundOff > 0 ? '+' : '−'}{fmtMoney(Math.abs(preview.roundOff))}
                    </dd>
                  </div>
                )}
              </dl>

              <div
                className="mt-5 rounded-2xl px-4 py-5 text-center text-white shadow-xl"
                style={{ background: `linear-gradient(135deg, ${theme.accent} 0%, #0f172a 100%)` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Grand total</p>
                <p className="mt-2 text-3xl font-black tabular-nums tracking-tight">{fmtMoney(preview.roundedTotal)}</p>
                <p className="mt-2 text-[10px] text-white/50 italic">Calculated preview</p>
              </div>

              {!isLocked && (
                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving || sending || !form.customer || !form.vehicle}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {saving ? 'Saving…' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndSend}
                    disabled={saving || sending || !form.customer || !form.vehicle}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: theme.accent }}
                  >
                    {sending ? 'Sending…' : 'Save & Send'}
                  </button>
                </div>
              )}
              <p className="mt-3 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                GST/round-off are estimated client-side for preview. Final amounts are always recalculated by the server on save.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
  )
}
