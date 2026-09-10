import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Gauge, Fuel, Cog, Search, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicInventoryVehicles, fetchPublicVehicleBrands } from '../utils/publicPortfolio'
import heroFallbackImage from '../assets/images/hero-bmw-classic.png'
import hatchbackIcon from '../assets/images/body-types/hatchback.png'
import sedanIcon from '../assets/images/body-types/sedan.png'
import suvIcon from '../assets/images/body-types/suv.png'
import muvIcon from '../assets/images/body-types/muv.png'
import luxurySedanIcon from '../assets/images/body-types/luxury-sedan.png'
import luxurySuvIcon from '../assets/images/body-types/luxury-suv.png'

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
  const { theme, branding, brandingLogoUrl, tenantName, subdomain, tenantError, tenantErrorCode } = useTenantBranding()
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState([])
  const [allBrands, setAllBrands] = useState([])

  const [featuredTab, setFeaturedTab] = useState('best')
  const [selectedBodyType, setSelectedBodyType] = useState('')
  const [bodyTypeShowAll, setBodyTypeShowAll] = useState(false)
  const featuredScrollRef = useRef(null)

  useEffect(() => {
    if (!subdomain) return undefined
    let cancelled = false
    fetchPublicInventoryVehicles(subdomain)
      .then((data) => { if (!cancelled) setVehicles(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setVehicles([]) })
    fetchPublicVehicleBrands(subdomain)
      .then((data) => { if (!cancelled) setAllBrands(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setAllBrands([]) })
    return () => { cancelled = true }
  }, [subdomain])

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
    const countByName = new Map()
    vehicles.forEach((v) => {
      if (!v.brand_name) return
      countByName.set(v.brand_name, (countByName.get(v.brand_name) || 0) + 1)
    })

    // Every brand the tenant has created shows up here, even ones with zero
    // current inventory — not just brands derived from existing listings.
    const rows = allBrands.map((b) => ({
      name: b.name,
      logoUrl: b.logo_url || null,
      count: countByName.get(b.name) || 0,
    }))

    // Any inventory brand not present in allBrands (e.g. brand archived after
    // listing) still gets shown so counts aren't silently dropped.
    countByName.forEach((count, name) => {
      if (!rows.some((r) => r.name === name)) {
        const fromVehicle = vehicles.find((v) => v.brand_name === name)
        rows.push({ name, logoUrl: fromVehicle?.brand_logo_url || null, count })
      }
    })

    return rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [allBrands, vehicles])

  // Brands with live inventory get the full logo-card treatment; a large
  // catalog otherwise reads as a wall of identical letter circles, so
  // everything else collapses into a compact text chip list instead.
  const popularBrands = useMemo(() => brandCounts.filter((b) => b.count > 0), [brandCounts])
  const otherBrands = useMemo(
    () => brandCounts.filter((b) => b.count === 0).sort((a, b) => a.name.localeCompare(b.name)),
    [brandCounts]
  )

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactClick = () => {
    showToast('info', `Contact ${tenantName || 'the dealership'} directly to enquire about this vehicle.`)
  }

  const handleSelectBodyType = (type) => {
    setSelectedBodyType(type)
    setBodyTypeShowAll(false)
  }

  const scrollFeatured = (dir) => {
    featuredScrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  if (tenantError) {
    const isPortfolioDisabled = tenantErrorCode === 'PORTFOLIO_MODULE_NOT_ENABLED'
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-4 text-center text-white">
        <div>
          <h1 className="text-xl font-bold">{isPortfolioDisabled ? 'Portfolio Not Available' : 'Dealership not found'}</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            {isPortfolioDisabled
              ? 'This dealership does not have the Portfolio module enabled.'
              : 'Please check the URL and try again.'}
          </p>
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
            <Link to="/portfolio/inventory" className="transition hover:text-white">Inventory</Link>
            <Link to="/portfolio/contact" className="transition hover:text-white">Contact</Link>
          </nav>
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
              <Link
                to="/portfolio/inventory"
                className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow transition-opacity hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                View Inventory
              </Link>
              <Link
                to="/portfolio/contact"
                className="rounded-xl border border-[#3A3A3A] bg-transparent px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
              >
                Sell Your Car
              </Link>
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
              <Link
                to="/portfolio/inventory"
                className="rounded-xl border border-[#3A3A3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
              >
                View all {tenantName || 'showroom'} cars
              </Link>
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

      {/* Promotional banner row */}
      <section className="border-t border-[#1A1A1A] px-6 py-16">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-[#262626] bg-[#141414] p-7">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.accent }}>Have a car to sell?</p>
            <h3 className="mt-2 text-xl font-extrabold text-white">Sell Your Car With Us</h3>
            <p className="mt-2 text-sm text-[#9CA3AF]">Get a fair valuation and a hassle-free sale, handled directly by {tenantName || 'our team'}.</p>
            <Link
              to="/portfolio/contact"
              className="mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              Get Started
            </Link>
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
            <Link
              to="/portfolio/inventory"
              className="mt-5 inline-block rounded-xl border border-[#3A3A3A] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A1A1A]"
            >
              View Inventory
            </Link>
          </div>
        </div>
      </section>

      {/* Explore popular brands */}
      {brandCounts.length > 0 ? (
        <section id="brands" className="border-t border-[#1A1A1A] px-6 py-16">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">Explore Popular Brands</h2>

            {popularBrands.length > 0 ? (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
                {popularBrands.map((b) => (
                  <Link
                    key={b.name}
                    to={`/portfolio/inventory?brand=${encodeURIComponent(b.name)}`}
                    className="group flex flex-col items-center gap-2.5 text-center"
                  >
                    {b.logoUrl ? (
                      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white p-2 transition group-hover:scale-105">
                        <img src={b.logoUrl} alt={b.name} className="h-full w-full object-contain" />
                      </span>
                    ) : (
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-full text-base font-bold transition group-hover:scale-105"
                        style={{ backgroundColor: '#1A1A1A', color: '#9CA3AF' }}
                      >
                        {b.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-white">{b.name}</span>
                    <span className="text-xs font-semibold text-[#6B7280]">
                      {b.count} {b.count === 1 ? 'car' : 'cars'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-[#6B7280]">No listings yet — check back soon.</p>
            )}

            {otherBrands.length > 0 ? (
              <div className="mx-auto mt-12 max-w-3xl border-t border-[#1A1A1A] pt-8 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Also dealing in</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {otherBrands.map((b) => (
                    <Link
                      key={b.name}
                      to={`/portfolio/inventory?brand=${encodeURIComponent(b.name)}`}
                      className="rounded-full border border-[#262626] px-3 py-1.5 text-xs font-semibold text-[#9CA3AF] transition hover:border-[#3A3A3A] hover:text-white"
                    >
                      {b.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex justify-center">
              <Link
                to="/portfolio/inventory"
                className="rounded-xl border border-[#3A3A3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#141414]"
              >
                View all cars
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="px-6 py-16">
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
            <Link
              to="/portfolio/contact"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#141414] shadow hover:bg-slate-100"
            >
              Contact Us
            </Link>
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
              <p className="mt-2 max-w-xs text-sm text-[#6B7280]">
                {branding?.address || 'Quality vehicles, straightforward buying — browse the full inventory or get in touch.'}
              </p>
              {branding?.phone ? (
                <a href={`tel:${branding.phone}`} className="mt-1 inline-block text-sm text-[#9CA3AF] hover:text-white">
                  {branding.phone}
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[#9CA3AF] sm:justify-end">
              <button type="button" onClick={() => scrollToId('top')} className="hover:text-white">Home</button>
              <Link to="/portfolio/inventory" className="hover:text-white">Inventory</Link>
              <Link to="/portfolio/contact" className="hover:text-white">Contact</Link>
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
