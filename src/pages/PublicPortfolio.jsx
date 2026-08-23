import { useEffect, useMemo, useRef, useState } from 'react'
import { Car, Gauge, Fuel, Cog, Search, ShieldCheck, Sparkles, Heart, ChevronRight } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicInventoryVehicles } from '../utils/publicPortfolio'
import heroFallbackImage from '../assets/images/hero-bmw-classic.png'
import hatchbackIcon from '../assets/images/body-types/hatchback.png'
import sedanIcon from '../assets/images/body-types/sedan.png'
import suvIcon from '../assets/images/body-types/suv.png'
import muvIcon from '../assets/images/body-types/muv.png'
import luxurySedanIcon from '../assets/images/body-types/luxury-sedan.png'
import luxurySuvIcon from '../assets/images/body-types/luxury-suv.png'

const PRICE_BUCKETS = [
  { id: '', label: 'Any Price' },
  { id: '0-500000', label: 'Under ₹5,00,000' },
  { id: '500000-1000000', label: '₹5,00,000 - ₹10,00,000' },
  { id: '1000000-2500000', label: '₹10,00,000 - ₹25,00,000' },
  { id: '2500000-', label: 'Above ₹25,00,000' },
]

const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Verified Listings' },
  { icon: Sparkles, label: 'Real-Time Inventory' },
  { icon: Search, label: 'Easy Search & Filter' },
  { icon: Car, label: 'Every Body Type' },
]

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function isNewListing(createdAt) {
  if (!createdAt) return false
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

// Matches the "vehicle_types" master rows seeded for portfolio use (see
// backend/apps/platform/vehicles/migrations/0011_seed_body_type_vehicle_types.py).
// Shown unconditionally so the section always has all body types on display,
// regardless of whether this tenant currently has listings in every one.
const BODY_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury Sedan', 'Luxury SUV']

const BODY_TYPE_ICON_SRC = {
  Hatchback: hatchbackIcon,
  Sedan: sedanIcon,
  SUV: suvIcon,
  MUV: muvIcon,
  'Luxury Sedan': luxurySedanIcon,
  'Luxury SUV': luxurySuvIcon,
}

// Icons are black-outline PNGs; this page is dark end-to-end, so they're always
// flipped to white via CSS filter (raster images can't use currentColor).
function BodyTypeIcon({ type, size = 26, className = '' }) {
  const src = BODY_TYPE_ICON_SRC[type]
  if (!src) return <Car size={size} className={className} />
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`object-contain brightness-0 invert ${className}`}
    />
  )
}

export default function PublicPortfolio() {
  const { theme, brandingLogoUrl, tenantName, subdomain, tenantError } = useTenantBranding()
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [searchText, setSearchText] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [priceFilter, setPriceFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  const [featuredTab, setFeaturedTab] = useState('best')
  const [wishlist, setWishlist] = useState(() => new Set())
  const [selectedBodyType, setSelectedBodyType] = useState('')
  const [bodyTypeShowAll, setBodyTypeShowAll] = useState(false)
  const featuredScrollRef = useRef(null)

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
    return () => { cancelled = true }
  }, [subdomain])

  const brandOptions = useMemo(() => {
    const names = new Set(vehicles.map((v) => v.brand_name).filter(Boolean))
    return ['', ...Array.from(names).sort()]
  }, [vehicles])

  const filteredVehicles = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    let rows = vehicles.filter((v) => {
      const matchesSearch = !q ||
        v.brand_name?.toLowerCase().includes(q) ||
        v.vehicle_model_name?.toLowerCase().includes(q)
      const matchesBrand = !brandFilter || v.brand_name === brandFilter
      let matchesPrice = true
      if (priceFilter) {
        const [minStr, maxStr] = priceFilter.split('-')
        const min = Number(minStr) || 0
        const max = maxStr ? Number(maxStr) : Infinity
        const price = Number(v.listing_price || 0)
        matchesPrice = price >= min && price <= max
      }
      return matchesSearch && matchesBrand && matchesPrice
    })
    return rows
  }, [vehicles, searchText, brandFilter, priceFilter])

  const visibleVehicles = showAll ? filteredVehicles : filteredVehicles.slice(0, 4)

  const featuredVehicles = useMemo(() => {
    const rows = [...vehicles]
    if (featuredTab === 'new') {
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else {
      rows.sort((a, b) => Number(a.listing_price || 0) - Number(b.listing_price || 0))
    }
    return rows.slice(0, 8)
  }, [vehicles, featuredTab])

  const effectiveBodyType = selectedBodyType || BODY_TYPES[0]
  const bodyTypeVehicles = useMemo(
    () => vehicles.filter((v) => v.vehicle_type_name === effectiveBodyType),
    [vehicles, effectiveBodyType]
  )
  const visibleBodyTypeVehicles = bodyTypeShowAll ? bodyTypeVehicles : bodyTypeVehicles.slice(0, 4)

  const brandCounts = useMemo(() => {
    const map = new Map()
    vehicles.forEach((v) => {
      if (!v.brand_name) return
      map.set(v.brand_name, (map.get(v.brand_name) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [vehicles])

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactClick = () => {
    showToast('info', `Contact ${tenantName || 'the dealership'} directly to enquire about this vehicle.`)
  }

  const toggleWishlist = (id) => {
    setWishlist((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectBodyType = (type) => {
    setSelectedBodyType(type)
    setBodyTypeShowAll(false)
  }

  const scrollFeatured = (dir) => {
    featuredScrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  const handleBrandCardClick = (name) => {
    setBrandFilter(name)
    scrollToId('inventory')
  }

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-4 text-center text-white">
        <div>
          <h1 className="text-xl font-bold">Dealership not found</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Please check the URL and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[#262626] bg-[#0B0B0B]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            {brandingLogoUrl ? (
              <img src={brandingLogoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: theme.accentSoft }}>
                <Car size={18} style={{ color: theme.accent }} />
              </div>
            )}
            <span className="text-lg font-extrabold uppercase tracking-tight text-white">{tenantName || 'Showroom'}</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#9CA3AF] md:flex">
            <button type="button" onClick={() => scrollToId('top')} className="transition hover:text-white">Home</button>
            <button type="button" onClick={() => scrollToId('inventory')} className="transition hover:text-white">Inventory</button>
            <button type="button" onClick={() => scrollToId('brands')} className="transition hover:text-white">Brands</button>
            <button type="button" onClick={() => scrollToId('cta')} className="transition hover:text-white">Contact</button>
          </nav>
          <a
            href="/admin"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.accent }}
          >
            Sign In
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="bg-[#0B0B0B] pb-16 md:pb-20">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-10 px-6 pb-10 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
            >
              <Sparkles size={13} /> Featured Arrival
            </span>
            <h1 className="mt-5 text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white md:text-6xl">
              Find The Perfect<br />Car For <span style={{ color: theme.accent }}>You</span>
            </h1>
            <p className="mt-5 max-w-md text-[#9CA3AF]">
              Explore {tenantName || 'our'} curated selection of quality vehicles, each ready for its next owner.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToId('inventory')}
                className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow transition-opacity hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                View Inventory
              </button>
              <button
                type="button"
                onClick={() => scrollToId('cta')}
                className="rounded-xl border border-[#3A3A3A] bg-transparent px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
              >
                Sell Your Car
              </button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs font-semibold text-[#9CA3AF]">
                  <Icon size={16} style={{ color: theme.accent }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="h-72 overflow-hidden rounded-[20px] border border-[#262626] md:h-[26rem]">
            <img
              src={heroFallbackImage}
              alt="Featured vehicle"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Floating filter bar */}
        <div className="mx-auto max-w-[1000px] px-6">
          <div className="grid grid-cols-1 items-end gap-4 rounded-[20px] border border-[#262626] bg-[#141414] p-5 shadow-2xl sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Make &amp; Model</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search brands…"
                  className="w-full rounded-xl border border-[#262626] bg-[#1A1A1A] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#6B7280] focus:border-[#3A3A3A]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full rounded-xl border border-[#262626] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white outline-none focus:border-[#3A3A3A]"
              >
                {brandOptions.map((b) => (
                  <option key={b || 'all'} value={b}>{b || 'All Brands'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Price Range</label>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full rounded-xl border border-[#262626] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white outline-none focus:border-[#3A3A3A]"
              >
                {PRICE_BUCKETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Featured cars */}
      {featuredVehicles.length > 0 ? (
        <section className="border-t border-[#1A1A1A] px-6 py-16">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">
              Featured {tenantName || 'Showroom'} Cars
            </h2>
            <div className="mt-6 flex justify-center">
              <div className="inline-flex gap-1 rounded-full border border-[#262626] bg-[#141414] p-1">
                {[
                  { id: 'best', label: 'Best buys for you' },
                  { id: 'new', label: 'Newly added' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFeaturedTab(tab.id)}
                    className="rounded-full px-5 py-2.5 text-sm font-bold transition"
                    style={
                      featuredTab === tab.id
                        ? { backgroundColor: theme.accent, color: '#fff' }
                        : { color: '#9CA3AF' }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-8">
              <div
                ref={featuredScrollRef}
                className="flex gap-5 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {featuredVehicles.map((v) => (
                  <div key={v.id} className="w-72 shrink-0 overflow-hidden rounded-2xl border border-[#262626] bg-[#141414]">
                    <div className="relative h-40 bg-[#0B0B0B]">
                      {v.photo_urls?.[0] ? (
                        <img src={v.photo_urls[0]} alt={`${v.brand_name} ${v.vehicle_model_name}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Car size={36} className="text-[#3A3A3A]" />
                        </div>
                      )}
                      {isNewListing(v.created_at) ? (
                        <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#141414] shadow">
                          New
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(v.id)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow"
                        aria-label="Save to wishlist"
                      >
                        <Heart size={15} className={wishlist.has(v.id) ? 'fill-rose-500 text-rose-500' : 'text-[#6B7280]'} />
                      </button>
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
              {featuredVehicles.length > 3 ? (
                <button
                  type="button"
                  onClick={() => scrollFeatured(1)}
                  className="absolute -right-4 top-1/3 hidden h-10 w-10 items-center justify-center rounded-full border border-[#262626] bg-[#141414] text-[#9CA3AF] shadow-lg transition hover:text-white md:flex"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={18} />
                </button>
              ) : null}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => scrollToId('inventory')}
                className="rounded-xl border border-[#3A3A3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
              >
                View all {tenantName || 'showroom'} cars
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Browse by body type */}
      <section className="border-t border-[#1A1A1A] px-6 py-16">
        <div className="mx-auto max-w-[1240px]">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">Browse By Body Type</h2>
          <div className="mt-8 flex justify-center">
            <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-[#262626] bg-[#141414] p-3">
              {BODY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectBodyType(type)}
                  className="flex w-24 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-wide transition"
                  style={
                    effectiveBodyType === type
                      ? { backgroundColor: theme.accent, color: '#fff' }
                      : { color: '#9CA3AF' }
                  }
                >
                  <BodyTypeIcon type={type} size={30} />
                  {type}
                </button>
              ))}
            </div>
          </div>

          {visibleBodyTypeVehicles.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleBodyTypeVehicles.map((v) => (
                <div key={v.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#262626] bg-[#141414]">
                  {v.photo_urls?.[0] ? (
                    <img src={v.photo_urls[0]} alt={`${v.brand_name} ${v.vehicle_model_name}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car size={32} className="text-[#3A3A3A]" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-sm font-bold text-white">{v.brand_name} {v.vehicle_model_name}</p>
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">
                      <span className="text-sm font-extrabold text-white">{fmtMoney(v.listing_price)}</span> onwards
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-[#6B7280]">
              No {effectiveBodyType} listings yet — check back soon.
            </p>
          )}

          {bodyTypeVehicles.length > 4 ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setBodyTypeShowAll((s) => !s)}
                className="rounded-xl border border-[#3A3A3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
              >
                {bodyTypeShowAll ? 'Show less' : `View all ${effectiveBodyType}s`}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Full inventory */}
      <section id="inventory" className="border-t border-[#1A1A1A] px-6 py-16">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">Full Inventory</h2>
              <p className="mt-1 text-sm text-[#9CA3AF]">Results update instantly as you filter above</p>
            </div>
            {filteredVehicles.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-sm font-bold hover:underline"
                style={{ color: theme.accent }}
              >
                {showAll ? 'Show Less' : `View All (${filteredVehicles.length})`}
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="py-16 text-center text-[#6B7280]">Loading inventory…</p>
          ) : loadError ? (
            <p className="py-16 text-center text-rose-400">{loadError}</p>
          ) : filteredVehicles.length === 0 ? (
            <p className="py-16 text-center text-[#6B7280]">No vehicles match your search right now.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
          )}
        </div>
      </section>

      {/* Promotional banner row */}
      <section className="border-t border-[#1A1A1A] px-6 py-16">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-[#262626] bg-[#141414] p-7">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.accent }}>Have a car to sell?</p>
            <h3 className="mt-2 text-xl font-extrabold text-white">Sell Your Car With Us</h3>
            <p className="mt-2 text-sm text-[#9CA3AF]">Get a fair valuation and a hassle-free sale, handled directly by {tenantName || 'our team'}.</p>
            <button
              type="button"
              onClick={() => scrollToId('cta')}
              className="mt-5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              Get Started
            </button>
          </div>
          <div className="rounded-2xl border border-[#262626] bg-[#141414] p-7">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Questions about a listing?</p>
            <h3 className="mt-2 text-xl font-extrabold text-white">Talk to the Team</h3>
            <p className="mt-2 text-sm text-[#9CA3AF]">Reach out directly — we typically respond the same day.</p>
            <button
              type="button"
              onClick={handleContactClick}
              className="mt-5 rounded-xl border border-[#3A3A3A] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A1A1A]"
            >
              Enquire Now
            </button>
          </div>
          <div className="rounded-2xl border border-[#262626] bg-[#141414] p-7">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">{vehicles.length} vehicles listed</p>
            <h3 className="mt-2 text-xl font-extrabold text-white">See Everything In Stock</h3>
            <p className="mt-2 text-sm text-[#9CA3AF]">Browse the full, filterable inventory in one place.</p>
            <button
              type="button"
              onClick={() => scrollToId('inventory')}
              className="mt-5 rounded-xl border border-[#3A3A3A] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A1A1A]"
            >
              View Inventory
            </button>
          </div>
        </div>
      </section>

      {/* Explore popular brands */}
      {brandCounts.length > 0 ? (
        <section id="brands" className="border-t border-[#1A1A1A] px-6 py-16">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">Explore Popular Brands</h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
              {brandCounts.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => handleBrandCardClick(b.name)}
                  className="group flex flex-col items-center gap-2.5 text-center"
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full text-base font-bold transition group-hover:scale-105"
                    style={
                      brandFilter === b.name
                        ? { backgroundColor: theme.accent, color: '#fff' }
                        : { backgroundColor: '#1A1A1A', color: '#9CA3AF' }
                    }
                  >
                    {b.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-white">{b.name}</span>
                  <span className="text-xs font-semibold text-[#6B7280]">
                    {b.count} {b.count === 1 ? 'car' : 'cars'}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => { setBrandFilter(''); scrollToId('inventory') }}
                className="rounded-xl border border-[#3A3A3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
              >
                View all cars
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section id="cta" className="px-6 py-16">
        <div
          className="relative mx-auto max-w-[1240px] overflow-hidden rounded-3xl px-8 py-14 text-center text-white"
          style={{ backgroundColor: theme.accent }}
        >
          <ShieldCheck size={140} className="pointer-events-none absolute -right-6 -top-6 text-white/10" />
          <h2 className="text-3xl font-extrabold uppercase tracking-tight">Ready to find your next car?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Reach out to {tenantName || 'our team'} — we're happy to help you find the right vehicle.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleContactClick}
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#141414] shadow hover:bg-slate-100"
            >
              Contact Us
            </button>
            <a
              href="/admin"
              className="rounded-xl border border-white/60 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Dealer Sign In
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="border-t border-[#1A1A1A] px-6 py-8">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-6 sm:grid-cols-4">
          {TRUST_POINTS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-[#9CA3AF] sm:justify-start">
              <Icon size={16} style={{ color: theme.accent }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] py-10">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div>
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                {brandingLogoUrl ? (
                  <img src={brandingLogoUrl} alt={tenantName} className="h-7 w-7 rounded object-contain" />
                ) : null}
                <span className="text-lg font-extrabold uppercase tracking-tight text-white">{tenantName || 'Showroom'}</span>
              </div>
              <p className="mt-2 max-w-xs text-sm text-[#6B7280]">Quality vehicles, straightforward buying — browse the full inventory or get in touch.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[#9CA3AF] sm:justify-end">
              <button type="button" onClick={() => scrollToId('top')} className="hover:text-white">Home</button>
              <button type="button" onClick={() => scrollToId('inventory')} className="hover:text-white">Inventory</button>
              <button type="button" onClick={() => scrollToId('brands')} className="hover:text-white">Brands</button>
              <button type="button" onClick={() => scrollToId('cta')} className="hover:text-white">Contact</button>
            </div>
          </div>
          <div className="mt-8 border-t border-[#1A1A1A] pt-6 text-center text-xs text-[#6B7280]">
            © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
