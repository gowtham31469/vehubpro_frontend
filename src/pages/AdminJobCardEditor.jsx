import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileText,
  Lock,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  Truck,
  Wrench,
  X,
} from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchCustomers } from '../utils/customers'
import { createJobCard, generateJobCardPdf, getJobCard, updateJobCard, patchJobCard } from '../utils/jobCards'
import { generateInvoiceFromJobCard } from '../utils/invoices'
import { fetchServiceItems } from '../utils/services'
import { fetchServiceVehicles } from '../utils/vehicles'

const STATUS_OPTIONS = [
  { value: 'job_control', label: 'Job Control' },
  { value: 'working', label: 'Working' },
  { value: 'ready_for_fi', label: 'Ready for FI' },
  { value: 'completed', label: 'Job Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

// Only workflow-driven statuses appear in the dropdown.
// 'invoiced' is set automatically on invoice generation.
// 'delivered' is set via the dedicated "Mark as Delivered" button.
const DROPDOWN_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (s) => s.value !== 'invoiced' && s.value !== 'delivered'
)

const RECENT_KEY = 'vehubpro_jobcard_recent_service_ids'

function statusBadgeClass(status) {
  switch (status) {
    case 'job_control':
      return 'bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600'
    case 'working':
      return 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700/60'
    case 'ready_for_fi':
      return 'bg-orange-100 text-orange-900 ring-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-700/60'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700/60'
    case 'invoiced':
      return 'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-700/60'
    case 'delivered':
      return 'bg-indigo-100 text-indigo-800 ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:ring-indigo-700/60'
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-700/60'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:ring-slate-600'
  }
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || status
}

function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function newLineRow() {
  const key = globalThis.crypto?.randomUUID?.() ?? `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    key,
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
    status: 'job_control',
    discount_amount: '0',
    shop_fees: '0',
    line_items: [],
    notes: '',
    km_reading: '',
    next_service_km: '',
    estimated_delivery: '',
  }
}

function mapApiToForm(full) {
  const lines =
    full.line_items?.length > 0
      ? full.line_items.map((li) => ({
          key: li.id,
          service_item: parseServiceItemPk(li.service_item) ?? '',
          description: li.description ?? '',
          detail_text: li.detail_text ?? '',
          quantity: String(li.quantity ?? 1),
          unit_price: String(li.unit_price ?? 0),
          discount_amount: String(li.discount_amount ?? 0),
        }))
      : []
  return {
    customer: String(full.customer),
    vehicle: String(full.vehicle),
    status: full.status,
    discount_amount: String(full.discount_amount ?? 0),
    shop_fees: String(full.shop_fees ?? 0),
    line_items: lines,
    notes: full.notes || '',
    km_reading: full.km_reading != null ? String(full.km_reading) : '',
    next_service_km: full.next_service_km != null ? String(full.next_service_km) : '',
    estimated_delivery: full.estimated_delivery ? toDatetimeLocalValue(full.estimated_delivery) : '',
  }
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Display-only masking for workstation shoulder-surfing (data still transmitted per API authorization). */
function maskVin(vin) {
  const v = (vin || '').trim()
  if (v.length < 8) return v || '—'
  return `${v.slice(0, 10)}••••${v.slice(-4)}`
}

/** Catalog `ServiceItem` PK is a UUID; anything else (e.g. "Category — name") must not be sent as `service_item`. */
const SERVICE_ITEM_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseServiceItemPk(v) {
  if (v == null || v === '') return null
  const s = String(v).trim()
  return SERVICE_ITEM_UUID_RE.test(s) ? s : null
}

function catalogItemLabel(s) {
  if (!s?.name) return ''
  return s.category_name ? `${s.category_name} — ${s.name}` : String(s.name)
}

/** Collapse em dash / en dash / hyphen labels so "brake - brake" matches "brake — brake". */
function normalizeLabelForCompare(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s*[\u2013\u2014\u2212]\s*/g, ' ') // en dash, em dash, minus sign
    .replace(/\s*-\s*/g, ' ') // ASCII hyphen
    .replace(/\s+/g, ' ')
    .trim()
}

function labelsMatch(a, b) {
  return normalizeLabelForCompare(a) === normalizeLabelForCompare(b)
}

/** Resolve catalog row to UUID on save if state holds a label or name instead of id. */
function resolveServiceItemPk(row, items) {
  const direct = parseServiceItemPk(row.service_item)
  if (direct) return direct
  const list = items || []
  const raw = String(row.service_item || '').trim()
  if (raw && list.length) {
    let hit = list.find((s) => labelsMatch(catalogItemLabel(s), raw))
    if (!hit) hit = list.find((s) => String(s.name || '').trim() === raw)
    if (!hit) hit = list.find((s) => labelsMatch(String(s.name || ''), raw))
    if (hit?.id != null) return parseServiceItemPk(hit.id)
  }
  const desc = (row.description || '').trim()
  if (desc && list.length) {
    const exact = list.filter((s) => String(s.name || '').trim() === desc)
    if (exact.length === 1 && exact[0].id != null) return parseServiceItemPk(exact[0].id)
    const byLabel = list.find((s) => labelsMatch(catalogItemLabel(s), desc))
    if (byLabel?.id != null) return parseServiceItemPk(byLabel.id)
  }
  return null
}

/** Catalog GST % for one line, or null if not linked / unknown. */
function lineCatalogGstPercent(row, serviceItems) {
  const pk = resolveServiceItemPk(row, serviceItems)
  if (!pk) return null
  const item = (serviceItems || []).find((s) => String(s.id) === pk)
  if (!item) return null
  const g = Number(item.gst_percentage)
  return Number.isFinite(g) ? g : null
}

/** Trim trailing zeros for GST % labels (e.g. 18, 12.5). */
function formatGstPercentLabel(n) {
  if (!Number.isFinite(n)) return ''
  return n.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * Split integer cents across rows proportional to weights (same total as `totalCents`).
 */
function allocateCentsByWeight(weights, totalCents) {
  const wsum = weights.reduce((a, b) => a + b, 0)
  if (wsum <= 0 || totalCents <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (w / wsum) * totalCents)
  const base = raw.map((x) => Math.floor(x))
  let rem = totalCents - base.reduce((a, b) => a + b, 0)
  const order = raw
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r)
  for (let k = 0; k < rem; k++) {
    base[order[k % order.length].i] += 1
  }
  return base
}

/**
 * Per-line GST (CGST+SGST) from catalog % on line's share of header taxable; round per line then sum.
 * No static default rate — lines without catalog GST contribute 0 tax.
 */
function computePreview(form, serviceItems = []) {
  const filteredRows = form.line_items.filter(
    (row) => (row.description || '').trim() || resolveServiceItemPk(row, serviceItems) != null,
  )
  const discount = Math.max(0, Number(form.discount_amount) || 0)
  const shop = Math.max(0, Number(form.shop_fees) || 0)

  const lineNets = filteredRows.map((row) => {
    const qty = Number(row.quantity) || 0
    const up = Number(row.unit_price) || 0
    const da = Number(row.discount_amount) || 0
    return Math.max(0, Math.round((qty * up - da) * 100) / 100)
  })
  const sub = Math.round(lineNets.reduce((a, b) => a + b, 0) * 100) / 100
  const taxable = Math.max(0, Math.round((sub - discount) * 100) / 100)

  const taxableCents = Math.round(taxable * 100)
  const weightCents = lineNets.map((n) => Math.round(n * 100))
  const lineTaxableCents = allocateCentsByWeight(weightCents, taxableCents)
  const lineTaxable = lineTaxableCents.map((c) => c / 100)

  const gstRates = filteredRows.map((row) => lineCatalogGstPercent(row, serviceItems))

  const lineCgst = []
  const lineSgst = []
  filteredRows.forEach((_, i) => {
    const base = lineTaxable[i]
    const g = gstRates[i]
    const ratePct = g == null || !Number.isFinite(Number(g)) ? 0 : Number(g)
    const totalLineTax = Math.round(base * (ratePct / 100) * 100) / 100
    const half = Math.round((totalLineTax / 2) * 100) / 100
    const cg = half
    const sg = Math.round((totalLineTax - half) * 100) / 100
    lineCgst.push(cg)
    lineSgst.push(sg)
  })

  const cgst = Math.round(lineCgst.reduce((a, b) => a + b, 0) * 100) / 100
  const sgst = Math.round(lineSgst.reduce((a, b) => a + b, 0) * 100) / 100
  const taxTotal = Math.round((cgst + sgst) * 100) / 100

  const taxByKey = new Map()
  filteredRows.forEach((row, i) => {
    taxByKey.set(row.key, Math.round((lineCgst[i] + lineSgst[i]) * 100) / 100)
  })

  const allLinesHaveCatalogGst =
    filteredRows.length > 0 && gstRates.every((r) => r !== null && Number.isFinite(Number(r)))
  const firstRate = allLinesHaveCatalogGst ? Number(gstRates[0]) : null
  const uniformRate =
    allLinesHaveCatalogGst && gstRates.every((r) => Math.abs(Number(r) - firstRate) < 0.001)
      ? firstRate
      : null

  const gstLabels = {
    showPercent: uniformRate != null,
    halfRate: uniformRate != null ? uniformRate / 2 : null,
    totalRate: uniformRate,
  }

  const bucket = new Map()
  filteredRows.forEach((_, i) => {
    const r = gstRates[i]
    const key = r == null ? '_none' : String(Math.round(Number(r) * 1000) / 1000)
    if (!bucket.has(key)) {
      bucket.set(key, { rate: r, taxable: 0, cgst: 0, sgst: 0 })
    }
    const b = bucket.get(key)
    b.taxable = Math.round((b.taxable + lineTaxable[i]) * 100) / 100
    b.cgst = Math.round((b.cgst + lineCgst[i]) * 100) / 100
    b.sgst = Math.round((b.sgst + lineSgst[i]) * 100) / 100
  })
  const gstBreakdown = [...bucket.entries()]
    .map(([k, v]) => ({
      key: k,
      rate: v.rate,
      rateLabel: v.rate == null ? 'No catalog GST (0%)' : `${formatGstPercentLabel(v.rate)}% GST`,
      taxable: v.taxable,
      cgst: v.cgst,
      sgst: v.sgst,
      totalTax: Math.round((v.cgst + v.sgst) * 100) / 100,
    }))
    .sort((a, b) => {
      if (a.rate == null) return 1
      if (b.rate == null) return -1
      return a.rate - b.rate
    })

  const total = Math.round((taxable + cgst + sgst + shop) * 100) / 100

  return {
    sub,
    discount,
    taxable,
    cgst,
    sgst,
    taxTotal,
    shop,
    total,
    taxByKey,
    filteredRows,
    gstLabels,
    gstBreakdown,
  }
}

function readRecentIds() {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  } catch {
    return []
  }
}

function pushRecentId(id) {
  const cur = readRecentIds().filter((x) => x !== id)
  cur.unshift(id)
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 8)))
}

function removeRecentId(id) {
  const cur = readRecentIds().filter((x) => String(x) !== String(id))
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(cur))
}

export default function AdminJobCardEditor() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTenantBranding()
  const { showToast } = useToast()
  const isNew = !routeId || routeId === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [markingDelivered, setMarkingDelivered] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [header, setHeader] = useState({ jobcard_number: null, updated_at: null })
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [serviceItems, setServiceItems] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceComboOpen, setServiceComboOpen] = useState(false)
  const [activeServiceIndex, setActiveServiceIndex] = useState(null)
  const [serviceComboError, setServiceComboError] = useState('')
  const [recentIds, setRecentIds] = useState(() => readRecentIds())
  const [vinRevealed, setVinRevealed] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [custOpen, setCustOpen] = useState(false)
  const [vehOpen, setVehOpen] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false)
  const [recommendationText, setRecommendationText] = useState('')
  const [pendingStatus, setPendingStatus] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const statusRef = useRef(null)
  const custRef = useRef(null)
  const vehRef = useRef(null)
  const serviceComboRef = useRef(null)
  const serviceInputRef = useRef(null)
  const serviceDropdownRef = useRef(null)

  const preview = useMemo(() => computePreview(form, serviceItems), [form, serviceItems])
  const isLocked = form.status === 'invoiced'

  const loadVehiclesForCustomer = useCallback(async (customerId) => {
    if (!customerId) {
      setVehicles([])
      return
    }
    try {
      const d = await fetchServiceVehicles({ page: 1, pageSize: 100, customerId })
      setVehicles(d.results || [])
    } catch {
      setVehicles([])
    }
  }, [])

  useEffect(() => {
    fetchCustomers({ page: 1, pageSize: 200 })
      .then((d) => setCustomers(d.results || []))
      .catch(() => setCustomers([]))
  }, [])

  useEffect(() => {
    fetchServiceItems({ page: 1, pageSize: 500, isActive: true })
      .then((d) => setServiceItems(d.results || []))
      .catch(() => setServiceItems([]))
  }, [])

  useEffect(() => {
    if (form.customer) void loadVehiclesForCustomer(form.customer)
    else setVehicles([])
  }, [form.customer, loadVehiclesForCustomer])

  useEffect(() => {
    if (isNew) {
      setForm(emptyForm())
      setHeader({ jobcard_number: null, updated_at: null })
      setLoading(false)
      setVinRevealed(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const full = await getJobCard(routeId)
        if (cancelled) return
        const mapped = mapApiToForm(full)
        setForm(mapped)
        setHeader({ jobcard_number: full.jobcard_number, updated_at: full.updated_at })
        if (Number(mapped.discount_amount) > 0) setCouponOpen(true)
        void loadVehiclesForCustomer(String(full.customer))
      } catch (e) {
        if (e.message === 'SESSION_EXPIRED') {
          globalThis.location.href = '/admin'
          return
        }
        if (!cancelled) setError(e.message || 'Failed to load job card.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isNew, routeId, loadVehiclesForCustomer])

  useEffect(() => {
    if (!statusOpen && !custOpen && !vehOpen && !serviceComboOpen) return undefined
    const down = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false)
      if (custRef.current && !custRef.current.contains(e.target)) setCustOpen(false)
      if (vehRef.current && !vehRef.current.contains(e.target)) setVehOpen(false)
      if (
        serviceComboRef.current && !serviceComboRef.current.contains(e.target) &&
        serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)
      ) setServiceComboOpen(false)
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [statusOpen, custOpen, vehOpen, serviceComboOpen])

  // Calculate dropdown position for portal rendering and update on scroll/resize
  useEffect(() => {
    if (!serviceComboOpen || !serviceInputRef.current) return

    const updatePosition = () => {
      if (serviceInputRef.current) {
        const rect = serviceInputRef.current.getBoundingClientRect()
        // For fixed positioning, use viewport-relative coordinates
        setDropdownPos({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        })
      }
    }

    updatePosition()

    // Find the scrollable parent container (typically the main content area)
    const scrollableParent = serviceInputRef.current?.closest('main')

    if (scrollableParent) {
      scrollableParent.addEventListener('scroll', updatePosition, { passive: true })
    }
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition, { passive: true })

    return () => {
      if (scrollableParent) {
        scrollableParent.removeEventListener('scroll', updatePosition)
      }
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [serviceComboOpen])

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(form.customer)),
    [customers, form.customer],
  )
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === String(form.vehicle)),
    [vehicles, form.vehicle],
  )
  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    if (!q)
      return [...serviceItems].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
      )
    return serviceItems.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) || (s.category_name || '').toLowerCase().includes(q),
    )
  }, [serviceItems, serviceSearch])

  /** Reset highlight when the search query or result count changes — not when only the filtered array reference changes. */
  useEffect(() => {
    if (!filteredServices.length) setActiveServiceIndex(null)
    else setActiveServiceIndex(0)
  }, [serviceSearch, filteredServices.length])

  const highlightIndex =
    filteredServices.length === 0
      ? null
      : activeServiceIndex != null &&
          activeServiceIndex >= 0 &&
          activeServiceIndex < filteredServices.length
        ? activeServiceIndex
        : 0

  const addLineFromService = (svc) => {
    if (!svc) return
    const itemPk = parseServiceItemPk(svc.id)
    
    if (itemPk && form.line_items.some((r) => resolveServiceItemPk(r, serviceItems) === itemPk)) {
      setServiceComboError(`"${svc.name}" is already added.`)
      setServiceSearch('')
      setServiceComboOpen(false)
      return
    }
    
    if (itemPk) pushRecentId(itemPk)
    setRecentIds(readRecentIds())
    const row = newLineRow()
    row.service_item = parseServiceItemPk(svc?.id) ?? ''
    row.description = svc.name || ''
    row.detail_text = (svc.description || '').trim().slice(0, 500)
    row.unit_price = String(svc.base_price ?? 0)
    setForm((p) => ({
      ...p,
      line_items: [...p.line_items.filter((r) => (r.description || '').trim() || resolveServiceItemPk(r, serviceItems) != null), row],
    }))
    setServiceSearch('')
    setServiceComboError('')
    setServiceComboOpen(false)
  }

  const addServiceFromCombo = () => {
    const idx = highlightIndex
    const svc = idx != null ? filteredServices[idx] : null
    if (!svc) {
      setServiceComboError('Select a service from the list.')
      return
    }
    addLineFromService(svc)
  }

  const handleDownloadPdf = async () => {
    if (form.status === 'job_control' || isNew) return
    setGeneratingPdf(true)
    try {
      const { pdf_url } = await generateJobCardPdf(routeId)
      if (pdf_url) {
        globalThis.open(pdf_url, '_blank')
      }
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      showToast('error', e.message || 'Failed to generate job card PDF.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const persist = async () => {
    setError('')
    if (!form.customer || !form.vehicle) {
      setError('Customer and vehicle are required.')
      return
    }
    const line_items = form.line_items
      .map((row, idx) => ({
        sort_order: idx,
        service_item: resolveServiceItemPk(row, serviceItems),
        description: (row.description || '').trim(),
        detail_text: (row.detail_text || '').trim(),
        quantity: String(row.quantity || '1'),
        unit_price: String(row.unit_price || '0'),
        discount_amount: String(row.discount_amount || '0'),
      }))
      .filter((row) => (row.description || '').trim() || row.service_item != null)
    const payload = {
      customer: form.customer,
      vehicle: form.vehicle,
      status: form.status,
      discount_amount: String(form.discount_amount || 0),
      shop_fees: String(form.shop_fees || 0),
      line_items,
      notes: form.notes.trim() || null,
      km_reading: form.km_reading ? Number(form.km_reading) : null,
      next_service_km: form.next_service_km ? Number(form.next_service_km) : null,
      estimated_delivery: form.estimated_delivery ? new Date(form.estimated_delivery).toISOString() : null,
    }
    setSaving(true)
    try {
      if (isNew) {
        const created = await createJobCard(payload)
        navigate(`/admin/job-cards/${created.id}`, { replace: true })
      } else {
        const updated = await updateJobCard(routeId, payload)
        setForm(mapApiToForm(updated))
        setHeader({ jobcard_number: updated.jobcard_number, updated_at: updated.updated_at })
        showToast('success', 'Job card saved successfully.')
      }
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') {
        globalThis.location.href = '/admin'
        return
      }
      setError(e.message || 'Save failed.')
      showToast('error', e.message || 'Failed to save job card.')
    } finally {
      setSaving(false)
    }
  }

  const jobDisplay = header.jobcard_number || 'New job card'
  const displayVin = selectedVehicle?.vin_number || null
  const displayEmail = selectedCustomer?.email || '—'
  const displayPhone = selectedCustomer?.phone || '—'

  if (loading) {
    return (
      <AdminShell activeNav="job-cards">
        <div className="mx-auto max-w-6xl px-3 py-4 md:px-4">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-center p-20 text-slate-500 dark:text-slate-400">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Loading job card…
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
      <AdminShell activeNav="job-cards">
        <div className="mx-auto max-w-6xl px-3 py-4 md:px-4">
          {/* Compliance strip — DPDP / GDPR awareness */}
          <div className="mb-4 flex flex-wrap items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 backdrop-blur-sm dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-100">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sky-950 dark:text-sky-50">Personal &amp; vehicle data — authorized use only</p>
              <p className="mt-1 text-xs leading-relaxed text-sky-900/90 dark:text-sky-200/70">
                Process customer PII under your DPA, privacy notice, and lawful basis. Do not store payment card numbers, Aadhaar, or
                other special-category data in free-text notes. Changes to job cards {isLocked ? 'are locked' : 'are subject'} to your organization&apos;s access controls
                and audit logging.
              </p>
            </div>
          </div>

          <nav className="mb-3 text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link to="/admin/job-cards" className="font-medium hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  Job Cards
                </Link>
              </li>
              <li aria-hidden className="mx-1">/</li>
              <li className="font-semibold text-slate-800 dark:text-slate-100">{isNew ? 'New' : jobDisplay}</li>
            </ol>
          </nav>

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/admin/job-cards"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-800/50"
                aria-label="Back to list"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                  Job #{isNew ? '—' : jobDisplay}
                </h1>
              </div>
              <span
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${statusBadgeClass(form.status)} dark:bg-opacity-20`}
              >
                {statusLabel(form.status)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">

              {/* ── Update status dropdown (hidden for new cards and once invoiced/delivered) ── */}
              {!isNew && form.status !== 'invoiced' && form.status !== 'delivered' && (
                <div className="relative" ref={statusRef}>
                  <button
                    type="button"
                    onClick={() => setStatusOpen((o) => !o)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil size={15} className="text-slate-400" />
                    Update status
                    <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${statusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {statusOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Change status</p>
                      </div>
                      <div className="py-1">
                        {DROPDOWN_STATUS_OPTIONS.map((s) => {
                          const isActive = form.status === s.value
                          return (
                            <button
                              key={s.value}
                              type="button"
                              onClick={async () => {
                                if (s.value === 'completed' && !isNew) {
                                  setPendingStatus(s.value)
                                  setRecommendationText('')
                                  setRecommendationModalOpen(true)
                                  setStatusOpen(false)
                                } else {
                                  setForm((p) => ({ ...p, status: s.value }))
                                  setStatusOpen(false)
                                  if (!isNew) {
                                    try {
                                      await patchJobCard(routeId, { status: s.value })
                                      showToast('success', `Status updated to ${s.label}`)
                                    } catch (err) {
                                      showToast('error', err.message || 'Failed to update status.')
                                    }
                                  }
                                }
                              }}
                              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                                isActive
                                  ? 'bg-slate-50 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white'
                                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              {s.label}
                              {isActive && <Check size={13} className="ml-auto text-emerald-500" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Mark as Delivered (only when invoiced) ── */}
              {form.status === 'invoiced' && (
                <button
                  type="button"
                  disabled={markingDelivered || isNew}
                  onClick={async () => {
                    if (!routeId) return
                    setMarkingDelivered(true)
                    try {
                      await patchJobCard(routeId, { status: 'delivered' })
                      setForm((p) => ({ ...p, status: 'delivered' }))
                      showToast('success', 'Job card marked as delivered.')
                    } catch (e) {
                      showToast('error', e.message || 'Failed to mark as delivered.')
                    } finally {
                      setMarkingDelivered(false)
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#059669' }}
                >
                  {markingDelivered ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Updating…
                    </>
                  ) : (
                    <>
                      <Truck size={16} />
                      Mark as Delivered
                    </>
                  )}
                </button>
              )}

              {/* ── Generate invoice (only when completed) ── */}
              {form.status === 'completed' && (
                <button
                  type="button"
                  disabled={isNew || generatingInvoice}
                  onClick={async () => {
                    if (!routeId) return
                    setGeneratingInvoice(true)
                    try {
                      const invoice = await generateInvoiceFromJobCard(routeId)
                      showToast('success', `Invoice ${invoice.invoice_number} generated.`)
                      navigate(`/admin/invoices/${invoice.id}`)
                    } catch (e) {
                      if (e.message === 'SESSION_EXPIRED') { globalThis.location.href = '/admin'; return }
                      showToast('error', e.message || 'Failed to generate invoice.')
                    } finally {
                      setGeneratingInvoice(false)
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: theme.accent }}
                >
                  {generatingInvoice ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      Generate invoice
                    </>
                  )}
                </button>
              )}

              {/* ── Download PDF ── */}
              <button
                type="button"
                disabled={generatingPdf || form.status === 'job_control' || isNew}
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title={form.status === 'job_control' ? 'Available after Job Control stage' : 'Download Job Card PDF'}
              >
                {generatingPdf ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <Download size={16} className="text-slate-400" />
                    Download PDF
                  </>
                )}
              </button>

              <button
                  type="button"
                  disabled={saving || isLocked}
                  onClick={() => void persist()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  'Save job card'
                )}
              </button>
            </div>
          </div>

          {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">{error}</div> : null}

          {isLocked && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
              <Lock size={18} className="shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">This job card is locked</p>
                <p className="text-xs opacity-90">Invoiced job cards cannot be edited. Generate a new job card for additional work.</p>
              </div>
            </div>
          )}

          {/* Customer & vehicle — side by side from md, stacked on small screens */}
          <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <section
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/40"
                  aria-labelledby="cust-heading"
                >
                  <h2 id="cust-heading" className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Customer details
                  </h2>
                  <div className="flex gap-4">
                    <div
                      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-slate-100 overflow-hidden text-xl font-bold text-white shadow-sm"
                      style={!selectedCustomer?.photo_url ? { backgroundColor: theme.accent } : {}}
                      aria-hidden
                    >
                      {selectedCustomer?.photo_url ? (
                        <img src={selectedCustomer.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (selectedCustomer?.full_name || '?').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="relative" ref={custRef}>
                          <button
                            type="button"
                            onClick={() => !isLocked && setCustOpen((o) => !o)}
                            disabled={isLocked}
                            className="flex w-full items-start justify-between gap-2 rounded-lg text-left transition hover:bg-slate-50/80 disabled:cursor-default"
                          >
                            <span className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
                              {selectedCustomer?.full_name || 'Select customer'}
                            </span>
                            {!isLocked && (
                              <ChevronDown
                                size={20}
                                className={`mt-0.5 shrink-0 text-slate-400 transition ${custOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                              />
                            )}
                          </button>
                        {custOpen ? (
                          <div className="absolute left-0 right-0 z-50 mt-2 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
                            {customers.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setForm((p) => ({ ...p, customer: String(c.id), vehicle: '' }))
                                  setCustOpen(false)
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                {c.photo_url ? (
                                  <img src={c.photo_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover shadow-sm" />
                                ) : (
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 shadow-sm">
                                    {(c.full_name || '?').slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                                <span className="truncate">{c.full_name}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <p className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                          <Phone size={17} className="shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2} aria-hidden />
                          <span className="min-w-0">{displayPhone}</span>
                        </p>
                        <p className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                          <Mail size={17} className="shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2} aria-hidden />
                          <span className="min-w-0 break-all">{displayEmail}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/40"
                  aria-labelledby="veh-heading"
                >
                  <h2 id="veh-heading" className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Vehicle information
                  </h2>
                  <div className="flex gap-4">
                    <div
                      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm overflow-hidden"
                      aria-hidden
                    >
                      {selectedVehicle?.photo_url ? (
                        <img src={selectedVehicle.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.15}>
                          <path d="M4 13h2l1.2-3.6h11.6L19 13h1M5.5 13v3.5h13V13M8 16.5h.01M16 16.5h.01" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6 10.5L7 8h10l1 2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="relative" ref={vehRef}>
                        <button
                          type="button"
                          disabled={!form.customer || isLocked}
                          onClick={() => setVehOpen((o) => !o)}
                          className="flex w-full items-start justify-between gap-2 rounded-lg text-left transition enabled:hover:bg-slate-50/80 disabled:opacity-50"
                        >
                          <span className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
                            {selectedVehicle
                              ? `${selectedVehicle.brand_name || ''} ${selectedVehicle.vehicle_model_name || ''} (${selectedVehicle.year || '—'})`.trim()
                              : 'Select vehicle'}
                          </span>
                          {!isLocked && (
                            <ChevronDown
                              size={20}
                              className={`mt-0.5 shrink-0 text-slate-400 transition ${vehOpen ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                          )}
                        </button>
                        {vehOpen && form.customer ? (
                          <div className="absolute left-0 right-0 z-50 mt-2 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
                            {vehicles.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  setForm((p) => ({ ...p, vehicle: String(v.id) }))
                                  setVehOpen(false)
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                {v.photo_url ? (
                                  <img src={v.photo_url} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover shadow-sm" />
                                ) : (
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path d="M4 13h2l1.2-3.6h11.6L19 13h1M5.5 13v3.5h13V13M8 16.5h.01M16 16.5h.01" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M6 10.5L7 8h10l1 2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                )}
                                <span className="truncate">{v.registration_no} · {v.brand_name} {v.vehicle_model_name}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Plate</p>
                          <p className="mt-1.5 text-base font-semibold tracking-wide text-slate-900 dark:text-white">
                            {selectedVehicle?.registration_no || '—'}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">VIN</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="break-all font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                              {vinRevealed || !displayVin ? displayVin || '—' : maskVin(displayVin)}
                            </span>
                            {displayVin ? (
                              <button
                                type="button"
                                onClick={() => setVinRevealed((r) => !r)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                              >
                                <Lock size={11} />
                                {vinRevealed ? 'Mask' : 'Reveal'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
          </div>

          {/* Main column: services & lines · Sidebar: financial summary (starts beside services) */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/40">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Add services</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Search the catalog, pick a row in the list, then click Add service. Recent chips add in one tap. Tax (alloc.) uses each line&apos;s catalog GST%; header discount is split pro‑rata before line tax is rounded.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div ref={serviceComboRef} className="relative min-w-0 flex-1">
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        aria-hidden
                      />
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
                            return
                          }
                          if (!filteredServices.length) return
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setServiceComboOpen(true)
                            setActiveServiceIndex((i) => {
                              if (i == null) return 0
                              return Math.min(i + 1, filteredServices.length - 1)
                            })
                            return
                          }
                          if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setServiceComboOpen(true)
                            setActiveServiceIndex((i) => {
                              if (i == null) return Math.max(0, filteredServices.length - 1)
                              return Math.max(i - 1, 0)
                            })
                            return
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addServiceFromCombo()
                          }
                        }}
                        placeholder="Search for a predefined service…"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={serviceComboOpen}
                        aria-controls="jobcard-service-listbox"
                        aria-activedescendant={
                          highlightIndex != null && filteredServices[highlightIndex]
                            ? `jobcard-svc-opt-${filteredServices[highlightIndex].id}`
                            : undefined
                        }
                        disabled={isLocked}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 dark:disabled:bg-slate-800/50"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={serviceComboOpen ? 'Close service list' : 'Open service list'}
                        onMouseDown={(e) => !isLocked && e.preventDefault()}
                        onClick={() => {
                          if (!isLocked) {
                            setServiceComboOpen((o) => !o)
                            setServiceComboError('')
                          }
                        }}
                        disabled={isLocked}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-0 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      >
                        {!isLocked && (
                          <ChevronDown
                            size={18}
                            className={`transition-transform ${serviceComboOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                          />
                        )}
                      </button>
                    </div>
                    {serviceComboOpen &&
                      ReactDOM.createPortal(
                        <ul
                          ref={serviceDropdownRef}
                          id="jobcard-service-listbox"
                          role="listbox"
                          className="fixed z-[9999] max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90"
                          style={{
                            top: `${dropdownPos.top}px`,
                            left: `${dropdownPos.left}px`,
                            width: `${dropdownPos.width}px`,
                          }}
                        >
                        {filteredServices.length === 0 ? (
                          <li className="px-4 py-4 text-center text-xs text-slate-400">
                            {serviceSearch.trim()
                              ? `No matches for "${serviceSearch.trim()}"`
                              : 'No services in catalog'}
                          </li>
                        ) : (
                          filteredServices.map((s, i) => {
                            const active = i === highlightIndex
                            return (
                              <li key={s.id} role="presentation">
                                <button
                                  id={`jobcard-svc-opt-${s.id}`}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => setActiveServiceIndex(i)}
                                  onClick={() => {
                                    setServiceSearch(s.name || '')
                                    setActiveServiceIndex(i)
                                    setServiceComboOpen(false)
                                  }}
                                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                                    active ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  }`}
                                >
                                  {/* Icon box */}
                                  {s.image_url ? (
                                    <img
                                      src={s.image_url}
                                      alt=""
                                      className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                                    />
                                  ) : (
                                    <span
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                      style={{ backgroundColor: active ? `${theme.accent}22` : theme.mode === 'dark' ? '#1e293b' : '#f1f5f9' }}
                                    >
                                      <Wrench
                                        size={16}
                                        style={{ color: active ? theme.accent : '#64748b' }}
                                      />
                                    </span>
                                  )}

                                  {/* Name + description */}
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                      {s.name}
                                    </span>
                                    {s.description ? (
                                      <span className="block truncate text-xs text-slate-400 leading-tight mt-0.5 dark:text-slate-500">
                                        {s.description}
                                      </span>
                                    ) : s.category_name ? (
                                      <span className="block truncate text-xs text-slate-400 leading-tight mt-0.5 dark:text-slate-500">
                                        {s.category_name}
                                      </span>
                                    ) : null}
                                  </span>

                                  {/* Price + label */}
                                  <span className="shrink-0 text-right">
                                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                                      {fmtMoney(s.base_price)}
                                    </span>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                      Base Price
                                    </span>
                                  </span>
                                </button>
                              </li>
                            )
                          })
                        )}
                      </ul>,
                        document.getElementById('dropdown-portal')
                      )
                    }
                    {serviceComboError ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="status">
                        <svg className="h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium text-rose-800">{serviceComboError}</span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => addServiceFromCombo()}
                    disabled={isLocked || !serviceSearch.trim() || !filteredServices.some(s => s.name === serviceSearch)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-95"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Plus size={18} strokeWidth={2.25} aria-hidden />
                    Add service
                  </button>
                </div>
                {recentIds.some((rid) => serviceItems.find((x) => String(x.id) === rid)) ? (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Recent
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recentIds.map((rid) => {
                        const s = serviceItems.find((x) => String(x.id) === rid)
                        if (!s) return null
                        return (
                          <div
                            key={rid}
                            className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                          >
                            <button
                              type="button"
                              onClick={() => !isLocked && addLineFromService(s)}
                              disabled={isLocked}
                              className="inline-flex min-w-0 items-center gap-1.5 px-3 py-2 text-left hover:bg-slate-50/90 disabled:cursor-default"
                            >
                              <span className="shrink-0 text-slate-500">Recent:</span>
                              <span className="max-w-[12rem] truncate">{s.name}</span>
                              <span className="tabular-nums text-slate-500">{fmtMoney(s.base_price)}</span>
                            </button>
                            {!isLocked && (
                              <button
                                type="button"
                                aria-label={`Remove ${s.name} from recent`}
                                onClick={() => {
                                  removeRecentId(rid)
                                  setRecentIds(readRecentIds())
                                }}
                                className="flex shrink-0 items-center border-l border-slate-200 px-2 py-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <X size={15} strokeWidth={2.25} aria-hidden />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/40">
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Applied services</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-4 text-[10px] tracking-widest">Service</th>
                        <th className="px-5 py-4 text-right text-[10px] tracking-widest">Qty</th>
                        <th className="px-5 py-4 text-right text-[10px] tracking-widest">Unit price</th>
                        <th className="px-5 py-4 text-right text-[10px] tracking-widest">Tax (alloc.)</th>
                        <th className="px-5 py-4 text-right text-[10px] tracking-widest">Total</th>
                        <th className="px-5 py-4 w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {form.line_items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No lines yet</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                              Select a predefined service in the dropdown and click{' '}
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Add service</span>, or use a recent chip.
                            </p>
                          </td>
                        </tr>
                      ) : null}
                      {form.line_items.map((row) => {
                        const hasCatalog = resolveServiceItemPk(row, serviceItems) != null
                        const hasDesc = Boolean((row.description || '').trim())
                        const isDraft = !hasDesc && !hasCatalog
                        const lineNet =
                          Math.max(
                            0,
                            Math.round(((Number(row.quantity) || 0) * (Number(row.unit_price) || 0) - (Number(row.discount_amount) || 0)) * 100) / 100,
                          )
                        const tax = preview.taxByKey.get(row.key) ?? 0
                        return (
                          <tr
                            key={row.key}
                            className={`align-top transition-colors ${isDraft ? 'bg-amber-50/35 dark:bg-amber-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                          >
                            <td className="px-5 py-4">
                              <input
                                value={row.description}
                                readOnly={isLocked}
                                onChange={(e) =>
                                  !isLocked && setForm((p) => ({
                                    ...p,
                                    line_items: p.line_items.map((r) => (r.key === row.key ? { ...r, description: e.target.value } : r)),
                                  }))
                                }
                                className={`w-full min-w-[160px] border-0 bg-transparent p-0 font-bold text-slate-900 outline-none focus:ring-0 dark:text-slate-100 ${isLocked ? 'cursor-default' : ''}`}
                                placeholder="Service name"
                                autoComplete="off"
                              />
                              <input
                                value={row.detail_text}
                                readOnly={isLocked}
                                onChange={(e) =>
                                  !isLocked && setForm((p) => ({
                                    ...p,
                                    line_items: p.line_items.map((r) => (r.key === row.key ? { ...r, detail_text: e.target.value } : r)),
                                  }))
                                }
                                className={`mt-1 w-full min-w-[160px] border-0 bg-transparent p-0 text-xs text-slate-500 outline-none focus:ring-0 dark:text-slate-400 ${isLocked ? 'cursor-default' : ''}`}
                                placeholder="Detail / spec (optional)"
                                autoComplete="off"
                              />
                              {(() => {
                                const pk = parseServiceItemPk(row.service_item) ?? resolveServiceItemPk(row, serviceItems)
                                const item = pk ? serviceItems.find((s) => String(s.id) === pk) : null
                                const categoryName = item?.category_name || null
                                return categoryName ? (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{categoryName}</p>
                                ) : null
                              })()}
                            </td>
                            <td className="px-5 py-4 text-right tabular-nums">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={row.quantity}
                                readOnly={isLocked}
                                onChange={(e) =>
                                  !isLocked && setForm((p) => ({
                                    ...p,
                                    line_items: p.line_items.map((r) => (r.key === row.key ? { ...r, quantity: e.target.value } : r)),
                                  }))
                                }
                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums focus:border-slate-300 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 disabled:opacity-50"
                                disabled={isLocked}
                              />
                            </td>
                            <td className="px-5 py-4 text-right tabular-nums">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.unit_price}
                                readOnly={isLocked}
                                onChange={(e) =>
                                  !isLocked && setForm((p) => ({
                                    ...p,
                                    line_items: p.line_items.map((r) => (r.key === row.key ? { ...r, unit_price: e.target.value } : r)),
                                  }))
                                }
                                className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums focus:border-slate-300 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 disabled:opacity-50"
                                disabled={isLocked}
                              />
                            </td>
                            <td className="px-5 py-4 text-right tabular-nums text-slate-600">{fmtMoney(tax)}</td>
                            <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">{fmtMoney(lineNet + tax)}</td>
                            <td className="px-5 py-4">
                              {!isLocked && (
                                <button
                                  type="button"
                                  aria-label="Remove line"
                                  onClick={() =>
                                    setForm((p) => ({
                                      ...p,
                                      line_items: p.line_items.filter((r) => r.key !== row.key),
                                    }))
                                  }
                                  className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
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

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/40">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Internal staff notes</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Operational notes only. Avoid unnecessary PII; prefer structured customer records. Updates are tied to your authenticated session and tenant audit policies.
                </p>
                <textarea
                  value={form.notes}
                  readOnly={isLocked}
                  onChange={(e) => !isLocked && setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  autoComplete="off"
                  placeholder="Notes for workshop or billing…"
                  className={`mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="km-reading" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      KM reading
                    </label>
                    <input
                      id="km-reading"
                      type="number"
                      value={form.km_reading}
                      readOnly={isLocked}
                      onChange={(e) => !isLocked && setForm((p) => ({ ...p, km_reading: e.target.value }))}
                      placeholder="KM Reading"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 disabled:opacity-50"
                      disabled={isLocked}
                    />
                  </div>
                  <div>
                    <label htmlFor="next-km" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Next service KM
                    </label>
                    <input
                      id="next-km"
                      type="number"
                      value={form.next_service_km}
                      readOnly={isLocked}
                      onChange={(e) => !isLocked && setForm((p) => ({ ...p, next_service_km: e.target.value }))}
                      placeholder="Next Service KM"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 disabled:opacity-50"
                      disabled={isLocked}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="eta" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Estimated delivery
                    </label>
                    <input
                      id="eta"
                      type="datetime-local"
                      value={form.estimated_delivery}
                      readOnly={isLocked}
                      onChange={(e) => !isLocked && setForm((p) => ({ ...p, estimated_delivery: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 dark:[color-scheme:dark] disabled:opacity-50"
                      disabled={isLocked}
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Financial summary</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Subtotal</dt>
                    <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmtMoney(preview.sub)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Discount</dt>
                    <dd className="font-bold tabular-nums text-rose-600 dark:text-rose-500">−{fmtMoney(preview.discount)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Taxable</dt>
                    <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmtMoney(preview.taxable)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">
                      {preview.gstLabels.showPercent && preview.gstLabels.halfRate != null
                        ? `CGST (${formatGstPercentLabel(preview.gstLabels.halfRate)}%)`
                        : 'CGST'}
                    </dt>
                    <dd className="tabular-nums text-slate-700 dark:text-slate-300">{fmtMoney(preview.cgst)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">
                      {preview.gstLabels.showPercent && preview.gstLabels.halfRate != null
                        ? `SGST (${formatGstPercentLabel(preview.gstLabels.halfRate)}%)`
                        : 'SGST'}
                    </dt>
                    <dd className="tabular-nums text-slate-700 dark:text-slate-300">{fmtMoney(preview.sgst)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                    <dt className="text-slate-500 dark:text-slate-400">
                      {preview.gstLabels.showPercent && preview.gstLabels.totalRate != null
                        ? `Total GST (${formatGstPercentLabel(preview.gstLabels.totalRate)}%)`
                        : 'Total GST'}
                    </dt>
                    <dd className="font-medium tabular-nums">{fmtMoney(preview.taxTotal)}</dd>
                  </div>
                </dl>
                <dl className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Shop fees</dt>
                    <dd className="w-28">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.shop_fees}
                        readOnly={isLocked}
                        onChange={(e) => !isLocked && setForm((p) => ({ ...p, shop_fees: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 disabled:opacity-50"
                        disabled={isLocked}
                      />
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) return
                      if (couponOpen) {
                        setForm((p) => ({ ...p, discount_amount: '0' }))
                      }
                      setCouponOpen((o) => !o)
                    }}
                    disabled={isLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {couponOpen ? 'Remove Discount' : 'Apply Coupon / Discount'}
                  </button>
                  {couponOpen && (
                    <div className="mt-3 flex items-center gap-2">
                      <label htmlFor="header-discount" className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Discount (₹)
                      </label>
                      <input
                        id="header-discount"
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={form.discount_amount}
                        readOnly={isLocked}
                        onChange={(e) => !isLocked && setForm((p) => ({ ...p, discount_amount: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700 disabled:opacity-50"
                        disabled={isLocked}
                      />
                    </div>
                  )}
                </div>
                <div
                  className="mt-5 rounded-2xl px-4 py-5 text-center text-white shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${theme.accent} 0%, #0f172a 100%)` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Grand total</p>
                  <p className="mt-2 text-3xl font-black tabular-nums tracking-tight">{fmtMoney(preview.total)}</p>
                  <p className="mt-2 text-[10px] text-white/50 italic">Calculated preview</p>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                  CGST/SGST are half of each line&apos;s catalog GST rate, rounded per line then summed. Final amounts follow the server after save.
                </p>
              </div>
              <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200/80">
                <strong>ISO 27001 / SOC-style practice:</strong> restrict admin access, review audit logs regularly, define retention for job cards, and document subprocessors in your ROPA / privacy policy.
              </p>
            </aside>
          </div>

          <footer className="mt-10 border-t border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-600">
            <p>Internal use only · Personal data processed per tenant privacy program · VeHubPro</p>
            {header.updated_at ? <p className="mt-1.5">Record last updated: {new Date(header.updated_at).toLocaleString()}</p> : null}
          </footer>
        </div>

        {/* Next Service Recommendation Modal */}
        {recommendationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Next Service Recommendations</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Mark the service as completed and add recommendations for the customer&apos;s next service.
                </p>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Recommendations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={recommendationText}
                  onChange={(e) => setRecommendationText(e.target.value)}
                  placeholder="e.g., Next service in 3000 km or 3 months. Check brake pads during next service."
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  rows={4}
                />
              </div>
              <div className="flex gap-2 border-t border-slate-200 px-6 py-3 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setRecommendationModalOpen(false)
                    setPendingStatus(null)
                    setRecommendationText('')
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!recommendationText.trim()}
                  onClick={async () => {
                    if (!recommendationText.trim()) return
                    try {
                      setForm((p) => ({ ...p, status: pendingStatus }))
                      await patchJobCard(routeId, {
                        status: pendingStatus,
                        next_service_recommendation: recommendationText.trim(),
                      })
                      showToast('success', 'Job card marked as completed with recommendations.')
                      setRecommendationModalOpen(false)
                      setPendingStatus(null)
                      setRecommendationText('')
                    } catch (error) {
                      showToast('error', error.message || 'Failed to update job card.')
                    }
                  }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: theme.accent }}
                >
                  Complete & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminShell>
  )
}
