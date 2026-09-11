import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Car, Check, ChevronDown, Cog, Fuel, Gauge, Search, SlidersHorizontal, X } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicInventoryVehicles } from '../utils/publicPortfolio'

// Matches the "vehicle_types" master rows seeded for portfolio use (see
// backend/apps/platform/vehicles/migrations/0011_seed_body_type_vehicle_types.py).
const BODY_TYPE_OPTIONS = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury Sedan', 'Luxury SUV']
const TRANSMISSION_OPTIONS = ['automatic', 'manual']
// A fixed palette, not tenant-managed master data — mirrors
// InventoryVehicle.COLOR_CHOICES in backend/apps/platform/portfolio/models.py
// (also duplicated in AdminInventoryVehicleForm.jsx). Keep the `code`s in
// sync if that list changes.
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
const KM_BUCKETS = [10000, 30000, 50000, 75000, 100000, 125000, 150000]
// 8 "& above" buckets, two years apart, anchored to the current year so the
// list never goes stale (no hardcoded "2024" left behind after this year).
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_BUCKETS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i * 2)

const PAGE_SIZE = 12

const inputCls = "w-full rounded-xl border border-[#262626] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#6B7280] focus:border-[#3A3A3A]"
const labelCls = "mb-2 block text-[10px] font-bold uppercase tracking-wide text-[#6B7280]"

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function isNewListing(createdAt) {
  if (!createdAt) return false
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

/**
 * Filled circular checkbox badge, standing in for a native checkbox in the
 * Brands+Models tree. `state`: 'checked' | 'partial' | 'unchecked' — 'partial'
 * is a brand whose models are only partly selected (a small square instead
 * of a checkmark, matching the standard indeterminate-checkbox convention).
 */
function CheckBadge({ state, accentColor, size = 20 }) {
  const filled = state !== 'unchecked'
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-2 transition"
      style={{
        width: size, height: size,
        borderColor: filled ? accentColor : '#3A3A3A',
        backgroundColor: filled ? accentColor : 'transparent',
      }}
    >
      {state === 'checked' ? <Check size={Math.round(size * 0.6)} className="text-white" strokeWidth={3} /> : null}
      {state === 'partial' ? (
        <span className="rounded-[2px] bg-white" style={{ width: Math.round(size * 0.4), height: Math.round(size * 0.4) }} />
      ) : null}
    </span>
  )
}

const emptyFilters = {
  search: '',
  // Selected models, stored as "Brand||Model" so identically-named models
  // across different brands can't collide. A brand is "selected" only in
  // the derived sense of having all of its models in this list.
  models: [],
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxKm: '',
  fuelTypes: [],
  bodyTypes: [],
  transmissions: [],
  colors: [],
}

/** Overlapping dual <input type="range"> — no slider library in this repo, so hand-rolled. */
function PriceRangeSlider({ min, max, valueMin, valueMax, onChange, accentColor }) {
  const span = Math.max(1, max - min)
  const minPct = ((valueMin - min) / span) * 100
  const maxPct = ((valueMax - min) / span) * 100
  const thumbCls =
    "range-thumb pointer-events-none absolute left-0 right-0 top-1/2 h-4 w-full -translate-y-1/2 appearance-none bg-transparent " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-current " +
    "[&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-current [&::-moz-range-thumb]:cursor-pointer"

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-extrabold text-white">
        <span>{fmtMoney(valueMin)}</span>
        <span>{fmtMoney(valueMax)}</span>
      </div>
      <div className="relative mt-4 h-4">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-[#262626]" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, backgroundColor: accentColor }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax - 1), valueMax)}
          className={thumbCls}
          style={{ color: accentColor }}
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin + 1))}
          className={thumbCls}
          style={{ color: accentColor }}
          aria-label="Maximum price"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-[#6B7280]">
        <span>Minimum</span>
        <span>Maximum</span>
      </div>
    </div>
  )
}

/** Single-select "bucket" list — a radio look, but clicking the active one clears it. */
function BucketFilterGroup({ value, options, formatLabel, onSelect, accentColor }) {
  return (
    <div className="space-y-0.5">
      {options.map((opt) => {
        const selected = value === String(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(selected ? '' : String(opt))}
            className="flex w-full items-center gap-2.5 py-1.5 text-left"
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition"
              style={{ borderColor: selected ? accentColor : '#3A3A3A' }}
            >
              {selected ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} /> : null}
            </span>
            <span className="text-sm text-[#9CA3AF]">{formatLabel(opt)}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Plain multi-select checkbox list, used for fuel type / body type / transmission. */
function CheckboxFilterGroup({ options, selected, onToggle, accentColor, formatLabel }) {
  return (
    <div className="space-y-0.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2.5 py-1.5">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="h-4 w-4 shrink-0 rounded border-[#3A3A3A] bg-transparent"
            style={{ accentColor }}
          />
          <span className="text-sm capitalize text-[#9CA3AF]">{formatLabel ? formatLabel(opt) : opt}</span>
        </label>
      ))}
    </div>
  )
}

/** Clickable color swatch grid, multi-select — used for the Color filter. */
function ColorSwatchGroup({ options, selected, onToggle, accentColor }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((c) => {
        const active = selected.includes(c.code)
        return (
          <button
            key={c.code}
            type="button"
            onClick={() => onToggle(c.code)}
            className="relative h-10 w-10 rounded-xl border-2 transition"
            style={{
              backgroundColor: c.hex,
              borderColor: active ? accentColor : c.code === 'white' ? '#3A3A3A' : 'transparent',
              boxShadow: active ? `0 0 0 2px ${accentColor}55` : undefined,
            }}
            aria-label={c.name}
            aria-pressed={active}
            title={c.name}
          >
            {active ? (
              <Check
                size={16}
                strokeWidth={3}
                className="absolute inset-0 m-auto"
                style={{ color: c.light ? '#141414' : '#fff' }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default function PublicInventoryListing() {
  const { theme, brandingLogoUrl, tenantName, subdomain, tenantError, tenantErrorCode } = useTenantBranding()
  const { showToast } = useToast()

  const [searchParams] = useSearchParams()

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [filters, setFilters] = useState(() => ({ ...emptyFilters }))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [brandSearch, setBrandSearch] = useState('')
  const [expandedBrands, setExpandedBrands] = useState(() => new Set())

  useEffect(() => {
    if (!subdomain) {
      setLoading(false)
      setLoadError('This page must be viewed from your dealership subdomain.')
      return
    }
    let cancelled = false
    setLoading(true)
    fetchPublicInventoryVehicles(subdomain)
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setVehicles(list)
        // A brand card on the home page links here as ?brand=<name> to land
        // the buyer pre-filtered to that brand — seed it from the models
        // this brand actually has, now that the list has loaded.
        const brandParam = searchParams.get('brand')
        if (brandParam) {
          const models = new Set(
            list.filter((v) => v.brand_name === brandParam && v.vehicle_model_name).map((v) => v.vehicle_model_name),
          )
          if (models.size > 0) {
            const keys = Array.from(models).map((m) => `${brandParam}||${m}`)
            setFilters((prev) => ({ ...prev, models: Array.from(new Set([...prev.models, ...keys])) }))
            setExpandedBrands((prev) => new Set(prev).add(brandParam))
          }
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load inventory.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ?brand= is only meant to seed the filter once, at initial load
  }, [subdomain])

  const setFilter = (key, value) => {
    setVisibleCount(PAGE_SIZE)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleFilterValue = (key, value) => {
    setVisibleCount(PAGE_SIZE)
    setFilters((prev) => {
      const arr = prev[key]
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...prev, [key]: next }
    })
  }

  const clearFilters = () => {
    setVisibleCount(PAGE_SIZE)
    setFilters(emptyFilters)
    setBrandSearch('')
  }

  const toggleExpanded = (name) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  /** Brand checkbox toggles every model under it at once (select-all / clear-all). */
  const toggleBrandAll = (brand) => {
    setVisibleCount(PAGE_SIZE)
    setFilters((prev) => {
      const keys = brand.models.map((m) => `${brand.name}||${m}`)
      const allSelected = keys.length > 0 && keys.every((k) => prev.models.includes(k))
      const nextSet = new Set(prev.models)
      keys.forEach((k) => (allSelected ? nextSet.delete(k) : nextSet.add(k)))
      return { ...prev, models: Array.from(nextSet) }
    })
  }

  // Only brands actually present in the current inventory are offered here —
  // a brand master record with zero listings would just be a dead-end filter.
  const brandTree = useMemo(() => {
    const modelsByBrand = new Map()
    vehicles.forEach((v) => {
      if (!v.brand_name) return
      if (!modelsByBrand.has(v.brand_name)) modelsByBrand.set(v.brand_name, new Set())
      if (v.vehicle_model_name) modelsByBrand.get(v.brand_name).add(v.vehicle_model_name)
    })
    return Array.from(modelsByBrand.entries())
      .map(([name, models]) => ({ name, models: Array.from(models).sort() }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [vehicles])

  const visibleBrandTree = useMemo(() => {
    const q = brandSearch.trim().toLowerCase()
    if (!q) return brandTree
    return brandTree
      .map((b) => ({ ...b, models: b.models.filter((m) => m.toLowerCase().includes(q)) }))
      .filter((b) => b.name.toLowerCase().includes(q) || b.models.length > 0)
  }, [brandTree, brandSearch])

  const fuelTypeOptions = useMemo(() => {
    const names = new Set(vehicles.map((v) => v.fuel_type_name).filter(Boolean))
    return Array.from(names).sort()
  }, [vehicles])

  const priceBounds = useMemo(() => {
    const prices = vehicles.map((v) => Number(v.listing_price || 0)).filter((p) => p > 0)
    const max = prices.length ? Math.max(...prices) : 2000000
    return { min: 0, max: Math.max(10000, Math.ceil(max / 10000) * 10000) }
  }, [vehicles])
  const sliderMin = filters.minPrice === '' ? priceBounds.min : Number(filters.minPrice)
  const sliderMax = filters.maxPrice === '' ? priceBounds.max : Number(filters.maxPrice)

  const filteredVehicles = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return vehicles.filter((v) => {
      const matchesSearch = !q ||
        v.brand_name?.toLowerCase().includes(q) ||
        v.vehicle_model_name?.toLowerCase().includes(q)
      const brandModelKey = `${v.brand_name}||${v.vehicle_model_name}`
      const matchesBrandOrModel = filters.models.length === 0 || filters.models.includes(brandModelKey)
      const matchesFuel = filters.fuelTypes.length === 0 || filters.fuelTypes.includes(v.fuel_type_name)
      const matchesBody = filters.bodyTypes.length === 0 || filters.bodyTypes.includes(v.vehicle_type_name)
      const matchesTransmission = filters.transmissions.length === 0 || filters.transmissions.includes(v.transmission)
      const matchesColor = filters.colors.length === 0 || filters.colors.includes(v.color)
      const price = Number(v.listing_price || 0)
      const matchesMinPrice = filters.minPrice === '' || price >= Number(filters.minPrice)
      const matchesMaxPrice = filters.maxPrice === '' || price <= Number(filters.maxPrice)
      const matchesMinYear = !filters.minYear || Number(v.year) >= Number(filters.minYear)
      const matchesMaxKm = !filters.maxKm || Number(v.mileage_km || 0) <= Number(filters.maxKm)
      return matchesSearch && matchesBrandOrModel && matchesFuel && matchesBody && matchesColor &&
        matchesTransmission && matchesMinPrice && matchesMaxPrice && matchesMinYear && matchesMaxKm
    })
  }, [vehicles, filters])

  const visibleVehicles = filteredVehicles.slice(0, visibleCount)
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.models.length +
    filters.fuelTypes.length +
    filters.bodyTypes.length +
    filters.transmissions.length +
    filters.colors.length +
    (filters.minPrice !== '' || filters.maxPrice !== '' ? 1 : 0) +
    (filters.minYear ? 1 : 0) +
    (filters.maxKm ? 1 : 0)

  const handleContactClick = () => {
    showToast('info', `Contact ${tenantName || 'the dealership'} directly to enquire about this vehicle.`)
  }

  if (tenantError) {
    const isPortfolioDisabled = tenantErrorCode === 'PORTFOLIO_MODULE_NOT_ENABLED'
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-6 text-center text-[#9CA3AF]">
        <p>{isPortfolioDisabled ? 'This dealership does not have the Portfolio module enabled.' : 'This dealership page could not be found.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#1A1A1A] bg-[#0B0B0B]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          <Link to="/portfolio" className="flex items-center gap-2.5">
            {brandingLogoUrl ? (
              <img src={brandingLogoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: theme.accentSoft }}>
                <Car size={18} style={{ color: theme.accent }} />
              </div>
            )}
            <span className="text-lg font-extrabold uppercase tracking-tight text-white">{tenantName || 'Showroom'}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#9CA3AF] md:flex">
            <Link to="/portfolio" className="transition hover:text-white">Home</Link>
            <span className="text-white">Inventory</span>
            <Link to="/portfolio/contact" className="transition hover:text-white">Contact</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">Full Inventory</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {loading ? 'Loading vehicles…' : `${filteredVehicles.length} vehicle${filteredVehicles.length === 1 ? '' : 's'} found`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
          {/* Filters sidebar — sticks below the header and scrolls within its
              own box once the filter list outgrows the viewport, instead of
              scrolling away with the results below it. */}
          <aside
            className={`${filtersOpen ? 'block' : 'hidden'} lg:sticky lg:top-[84px] lg:block lg:max-h-[calc(100vh-104px)] lg:self-start lg:overflow-y-auto`}
          >
            <div className="rounded-2xl border border-[#262626] bg-[#141414] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-extrabold uppercase tracking-wide text-white">Filters</p>
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={clearFilters} className="text-xs font-bold hover:underline" style={{ color: theme.accent }}>
                    Clear all ({activeFilterCount})
                  </button>
                ) : null}
              </div>

              <div className="divide-y divide-[#1A1A1A]">
                <div className="pb-4">
                  <label className={labelCls}>Search</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      value={filters.search}
                      onChange={(e) => setFilter('search', e.target.value)}
                      placeholder="Make or model…"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>

                <div className="py-4">
                  <label className={labelCls}>Price Range</label>
                  <PriceRangeSlider
                    min={priceBounds.min}
                    max={priceBounds.max}
                    valueMin={sliderMin}
                    valueMax={sliderMax}
                    accentColor={theme.accent}
                    onChange={(lo, hi) => {
                      setVisibleCount(PAGE_SIZE)
                      setFilters((prev) => ({ ...prev, minPrice: String(lo), maxPrice: String(hi) }))
                    }}
                  />
                </div>

                <div className="py-4">
                  <label className={labelCls}>Brands + Models</label>
                  <div className="relative mb-3">
                    <input
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Search"
                      className={`${inputCls} pr-9`}
                    />
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                    {visibleBrandTree.length === 0 ? (
                      <p className="py-2 text-xs text-[#6B7280]">No brands match your search.</p>
                    ) : (
                      visibleBrandTree.map((b) => {
                        const checkedModelCount = b.models.filter((m) => filters.models.includes(`${b.name}||${m}`)).length
                        const brandState =
                          checkedModelCount === 0 ? 'unchecked' : checkedModelCount === b.models.length ? 'checked' : 'partial'
                        // Auto-open a group that already has a selection so
                        // that's visible at a glance, without forcing it open
                        // on every render (the user can still collapse it).
                        const expanded = expandedBrands.has(b.name) || Boolean(brandSearch.trim()) || brandState !== 'unchecked'
                        const hasModels = b.models.length > 0
                        return (
                          <div key={b.name} className="rounded-xl border border-transparent px-1 transition hover:border-[#1A1A1A]">
                            <div
                              role={hasModels ? 'button' : undefined}
                              tabIndex={hasModels ? 0 : undefined}
                              onClick={() => hasModels && toggleExpanded(b.name)}
                              onKeyDown={(e) => {
                                if (hasModels && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault()
                                  toggleExpanded(b.name)
                                }
                              }}
                              className={`flex items-center gap-3 py-2 ${hasModels ? 'cursor-pointer' : ''}`}
                              aria-expanded={hasModels ? expanded : undefined}
                            >
                              {/* Only this small label toggles selection — clicking
                                  it stops the click from also expanding/collapsing. */}
                              <label className="flex cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
                                <CheckBadge state={brandState} accentColor={theme.accent} />
                                <input
                                  type="checkbox"
                                  checked={brandState === 'checked'}
                                  onChange={() => toggleBrandAll(b)}
                                  className="sr-only"
                                />
                              </label>
                              <span className="flex-1 truncate text-sm font-semibold text-white">{b.name}</span>
                              {hasModels ? (
                                <ChevronDown size={14} className={`shrink-0 text-[#6B7280] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                              ) : null}
                            </div>
                            {expanded && b.models.length > 0 ? (
                              <div className="ml-2.5 space-y-0.5 border-l border-[#262626] pb-1 pl-4">
                                {b.models.map((m) => {
                                  const key = `${b.name}||${m}`
                                  const modelChecked = filters.models.includes(key)
                                  return (
                                    <div key={key} className="flex items-center gap-3 py-1.5">
                                      <label className="flex cursor-pointer items-center">
                                        <CheckBadge state={modelChecked ? 'checked' : 'unchecked'} accentColor={theme.accent} size={18} />
                                        <input
                                          type="checkbox"
                                          checked={modelChecked}
                                          onChange={() => toggleFilterValue('models', key)}
                                          className="sr-only"
                                        />
                                      </label>
                                      <span className="text-sm text-[#9CA3AF]">{m}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="py-4">
                  <label className={labelCls}>Year</label>
                  <BucketFilterGroup
                    value={filters.minYear}
                    options={YEAR_BUCKETS}
                    formatLabel={(y) => `${y} & above`}
                    onSelect={(v) => setFilter('minYear', v)}
                    accentColor={theme.accent}
                  />
                </div>

                <div className="py-4">
                  <label className={labelCls}>Kms Driven</label>
                  <BucketFilterGroup
                    value={filters.maxKm}
                    options={KM_BUCKETS}
                    formatLabel={(km) => `${Number(km).toLocaleString('en-IN')} kms or less`}
                    onSelect={(v) => setFilter('maxKm', v)}
                    accentColor={theme.accent}
                  />
                </div>

                <div className="py-4">
                  <label className={labelCls}>Fuel Type</label>
                  {fuelTypeOptions.length === 0 ? (
                    <p className="text-xs text-[#6B7280]">No fuel types in current inventory.</p>
                  ) : (
                    <CheckboxFilterGroup
                      options={fuelTypeOptions}
                      selected={filters.fuelTypes}
                      onToggle={(v) => toggleFilterValue('fuelTypes', v)}
                      accentColor={theme.accent}
                    />
                  )}
                </div>

                <div className="py-4">
                  <label className={labelCls}>Body Type</label>
                  <CheckboxFilterGroup
                    options={BODY_TYPE_OPTIONS}
                    selected={filters.bodyTypes}
                    onToggle={(v) => toggleFilterValue('bodyTypes', v)}
                    accentColor={theme.accent}
                  />
                </div>

                <div className="py-4">
                  <label className={labelCls}>Transmission</label>
                  <CheckboxFilterGroup
                    options={TRANSMISSION_OPTIONS}
                    selected={filters.transmissions}
                    onToggle={(v) => toggleFilterValue('transmissions', v)}
                    accentColor={theme.accent}
                  />
                </div>

                <div className="pt-4">
                  <label className={labelCls}>Color</label>
                  {/* Static palette, unlike the other filters — colors aren't
                      derived from current inventory (see COLOR_OPTIONS above). */}
                  <ColorSwatchGroup
                    options={COLOR_OPTIONS}
                    selected={filters.colors}
                    onToggle={(v) => toggleFilterValue('colors', v)}
                    accentColor={theme.accent}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#262626] bg-[#141414] py-2.5 text-sm font-bold text-white lg:hidden"
            >
              {filtersOpen ? <X size={16} /> : <SlidersHorizontal size={16} />}
              {filtersOpen ? 'Hide Filters' : `Show Filters${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
            </button>

            {loading ? (
              <p className="py-16 text-center text-[#6B7280]">Loading inventory…</p>
            ) : loadError ? (
              <p className="py-16 text-center text-rose-400">{loadError}</p>
            ) : filteredVehicles.length === 0 ? (
              <p className="py-16 text-center text-[#6B7280]">No vehicles match your filters right now.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleVehicles.map((v) => (
                    <div key={v.id} className="overflow-hidden rounded-2xl border border-[#262626] bg-[#141414]">
                      <div className="relative h-40 bg-[#0B0B0B]">
                        {v.photo_urls?.[0] ? (
                          <img src={v.photo_urls[0]} alt={`${v.brand_name} ${v.vehicle_model_name}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Car size={36} className="text-[#3A3A3A]" />
                          </div>
                        )}
                        {isNewListing(v.created_at) ? (
                          <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#141414] shadow">
                            New
                          </span>
                        ) : null}
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-white">{v.year} {v.brand_name} {v.vehicle_model_name}</p>
                        <p className="mt-0.5 text-lg font-extrabold" style={{ color: theme.accent }}>{fmtMoney(v.listing_price)}</p>
                        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] text-[#9CA3AF]">
                          <div className="flex flex-col items-center gap-1 rounded-lg bg-[#1A1A1A] py-2">
                            <Gauge size={14} />
                            {Number(v.mileage_km || 0).toLocaleString('en-IN')} km
                          </div>
                          <div className="flex flex-col items-center gap-1 rounded-lg bg-[#1A1A1A] py-2 capitalize">
                            <Cog size={14} />
                            {v.transmission}
                          </div>
                          <div className="flex flex-col items-center gap-1 rounded-lg bg-[#1A1A1A] py-2">
                            <Fuel size={14} />
                            {v.fuel_type_name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleContactClick}
                          className="mt-4 w-full rounded-xl py-2 text-sm font-bold text-white transition hover:opacity-90"
                          style={{ backgroundColor: theme.accent }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {visibleCount < filteredVehicles.length ? (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="rounded-xl border border-[#3A3A3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
                    >
                      Load More ({filteredVehicles.length - visibleCount} remaining)
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-[#1A1A1A] py-8">
        <div className="mx-auto max-w-[1240px] px-6 text-center text-xs text-[#6B7280]">
          © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
