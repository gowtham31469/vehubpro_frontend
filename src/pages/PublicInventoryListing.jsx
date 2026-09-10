import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Car, Cog, Fuel, Gauge, Search, SlidersHorizontal, X } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicInventoryVehicles, fetchPublicVehicleBrands } from '../utils/publicPortfolio'

// Matches the "vehicle_types" master rows seeded for portfolio use (see
// backend/apps/platform/vehicles/migrations/0011_seed_body_type_vehicle_types.py).
const BODY_TYPE_OPTIONS = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury Sedan', 'Luxury SUV']

const PAGE_SIZE = 12

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function isNewListing(createdAt) {
  if (!createdAt) return false
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

const emptyFilters = {
  search: '',
  brand: '',
  model: '',
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxYear: '',
  maxKm: '',
  fuelType: '',
  bodyType: '',
  transmission: '',
}

export default function PublicInventoryListing() {
  const { theme, brandingLogoUrl, tenantName, subdomain, tenantError, tenantErrorCode } = useTenantBranding()
  const { showToast } = useToast()

  const [searchParams] = useSearchParams()

  const [vehicles, setVehicles] = useState([])
  const [allBrands, setAllBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // A brand card on the home page links here as ?brand=<name> to land the
  // buyer pre-filtered to that brand.
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, brand: searchParams.get('brand') || '' }))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    if (!subdomain) {
      setLoading(false)
      setLoadError('This page must be viewed from your dealership subdomain.')
      return
    }
    let cancelled = false
    setLoading(true)
    fetchPublicInventoryVehicles(subdomain)
      .then((data) => { if (!cancelled) setVehicles(Array.isArray(data) ? data : []) })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load inventory.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    fetchPublicVehicleBrands(subdomain)
      .then((data) => { if (!cancelled) setAllBrands(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setAllBrands([]) })
    return () => { cancelled = true }
  }, [subdomain])

  const setFilter = (key, value) => {
    setVisibleCount(PAGE_SIZE)
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'brand') next.model = ''
      return next
    })
  }

  const clearFilters = () => {
    setVisibleCount(PAGE_SIZE)
    setFilters(emptyFilters)
  }

  const modelOptions = useMemo(() => {
    if (!filters.brand) return []
    const names = new Set(
      vehicles.filter((v) => v.brand_name === filters.brand).map((v) => v.vehicle_model_name).filter(Boolean)
    )
    return Array.from(names).sort()
  }, [vehicles, filters.brand])

  const fuelTypeOptions = useMemo(() => {
    const names = new Set(vehicles.map((v) => v.fuel_type_name).filter(Boolean))
    return Array.from(names).sort()
  }, [vehicles])

  const filteredVehicles = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return vehicles.filter((v) => {
      const matchesSearch = !q ||
        v.brand_name?.toLowerCase().includes(q) ||
        v.vehicle_model_name?.toLowerCase().includes(q)
      const matchesBrand = !filters.brand || v.brand_name === filters.brand
      const matchesModel = !filters.model || v.vehicle_model_name === filters.model
      const matchesFuel = !filters.fuelType || v.fuel_type_name === filters.fuelType
      const matchesBody = !filters.bodyType || v.vehicle_type_name === filters.bodyType
      const matchesTransmission = !filters.transmission || v.transmission === filters.transmission
      const price = Number(v.listing_price || 0)
      const matchesMinPrice = !filters.minPrice || price >= Number(filters.minPrice)
      const matchesMaxPrice = !filters.maxPrice || price <= Number(filters.maxPrice)
      const matchesMinYear = !filters.minYear || Number(v.year) >= Number(filters.minYear)
      const matchesMaxYear = !filters.maxYear || Number(v.year) <= Number(filters.maxYear)
      const matchesMaxKm = !filters.maxKm || Number(v.mileage_km || 0) <= Number(filters.maxKm)
      return matchesSearch && matchesBrand && matchesModel && matchesFuel && matchesBody &&
        matchesTransmission && matchesMinPrice && matchesMaxPrice && matchesMinYear && matchesMaxYear && matchesMaxKm
    })
  }, [vehicles, filters])

  const visibleVehicles = filteredVehicles.slice(0, visibleCount)
  const activeFilterCount = Object.values(filters).filter(Boolean).length

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

  const inputCls = "w-full rounded-xl border border-[#262626] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#6B7280] focus:border-[#3A3A3A]"
  const labelCls = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6B7280]"

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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters sidebar */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="rounded-2xl border border-[#262626] bg-[#141414] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-extrabold uppercase tracking-wide text-white">Filters</p>
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={clearFilters} className="text-xs font-bold hover:underline" style={{ color: theme.accent }}>
                    Clear all ({activeFilterCount})
                  </button>
                ) : null}
              </div>

              <div className="space-y-4">
                <div>
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

                <div>
                  <label className={labelCls}>Brand</label>
                  <select value={filters.brand} onChange={(e) => setFilter('brand', e.target.value)} className={inputCls}>
                    <option value="">All Brands</option>
                    {allBrands.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Model</label>
                  <select
                    value={filters.model}
                    onChange={(e) => setFilter('model', e.target.value)}
                    disabled={!filters.brand}
                    className={`${inputCls} disabled:opacity-50`}
                  >
                    <option value="">{filters.brand ? 'All Models' : 'Select a brand first'}</option>
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Body Type</label>
                  <select value={filters.bodyType} onChange={(e) => setFilter('bodyType', e.target.value)} className={inputCls}>
                    <option value="">Any Body Type</option>
                    {BODY_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Fuel Type</label>
                  <select value={filters.fuelType} onChange={(e) => setFilter('fuelType', e.target.value)} className={inputCls}>
                    <option value="">Any Fuel Type</option>
                    {fuelTypeOptions.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Transmission</label>
                  <select value={filters.transmission} onChange={(e) => setFilter('transmission', e.target.value)} className={inputCls}>
                    <option value="">Any Transmission</option>
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Price Range (₹)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={filters.minPrice}
                      onChange={(e) => setFilter('minPrice', e.target.value)}
                      placeholder="Min"
                      className={inputCls}
                    />
                    <span className="text-[#6B7280]">–</span>
                    <input
                      type="number"
                      min={0}
                      value={filters.maxPrice}
                      onChange={(e) => setFilter('maxPrice', e.target.value)}
                      placeholder="Max"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Year</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1980}
                      value={filters.minYear}
                      onChange={(e) => setFilter('minYear', e.target.value)}
                      placeholder="From"
                      className={inputCls}
                    />
                    <span className="text-[#6B7280]">–</span>
                    <input
                      type="number"
                      min={1980}
                      value={filters.maxYear}
                      onChange={(e) => setFilter('maxYear', e.target.value)}
                      placeholder="To"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Max KMs Driven</label>
                  <input
                    type="number"
                    min={0}
                    value={filters.maxKm}
                    onChange={(e) => setFilter('maxKm', e.target.value)}
                    placeholder="e.g. 50000"
                    className={inputCls}
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
