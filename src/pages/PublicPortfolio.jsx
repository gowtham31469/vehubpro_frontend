import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Gauge, Fuel, Cog, Search, ShieldCheck, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
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

// Fixed portfolio theme — deliberately NOT the tenant's dynamic brand color
// (theme.accent/accentSoft from useTenantBranding). This page uses a fixed
// light theme + purple/teal palette regardless of tenant branding.
const ACCENT = '#4B116B'
const ACCENT_SOFT = '#F0E4F5'
const TEAL = '#0F766E'
const TEAL_SOFT = '#CCFBF1'
const BTN_SHADOW = '0 10px 25px -8px rgba(75, 17, 107, 0.5)'
const HERO_IMG_SHADOW = '0 20px 45px -15px rgba(15, 23, 42, 0.25)'

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
  return days <= 10
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

// Icons are black-outline PNGs; on this light theme they render as plain
// black (brightness-0) by default, and flip to white (invert) only when
// shown on the solid purple "active" background — raster images can't use
// currentColor, so a CSS filter swap is the only way to recolor them.
function BodyTypeIcon({ type, size = 26, active = false }) {
  const src = BODY_TYPE_ICON_SRC[type]
  if (!src) return <Car size={size} className={active ? 'text-white' : 'text-slate-600'} />
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${active ? 'brightness-0 invert' : 'brightness-0'}`}
    />
  )
}

export default function PublicPortfolio() {
  const { branding, brandingLogoUrl, tenantName, subdomain, tenantError } = useTenantBranding()
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState([])
  const [allBrands, setAllBrands] = useState([])

  const [selectedBodyType, setSelectedBodyType] = useState('')
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
    // Only vehicles the tenant has explicitly flagged as "Featured" (via
    // AdminInventoryVehicleForm.jsx) show here — not just the cheapest/newest
    // of the whole inventory.
    return vehicles
      .filter((v) => v.is_featured)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
  }, [vehicles])

  const effectiveBodyType = selectedBodyType || BODY_TYPES[0]
  const bodyTypeVehicles = useMemo(
    () =>
      vehicles
        .filter((v) => v.vehicle_type_name === effectiveBodyType)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [vehicles, effectiveBodyType]
  )
  const visibleBodyTypeVehicles = bodyTypeVehicles.slice(0, 4)

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

  // Only brands with live inventory get shown here — brand masters with zero
  // current listings are catalog housekeeping, not something a visitor
  // browsing available cars needs to see.
  const popularBrands = useMemo(() => brandCounts.filter((b) => b.count > 0), [brandCounts])

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactClick = () => {
    showToast('info', `Contact ${tenantName || 'the dealership'} directly to enquire about this vehicle.`)
  }

  const handleSelectBodyType = (type) => {
    setSelectedBodyType(type)
  }

  const scrollFeatured = (dir) => {
    featuredScrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-slate-900">
        <div>
          <h1 className="text-xl font-bold">Dealership not found</h1>
          <p className="mt-2 text-sm text-slate-500">Please check the URL and try again.</p>
        </div>
      </div>
    )
  }

  if (branding?.has_portfolio_access === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-slate-900">
        <div>
          <h1 className="text-xl font-bold">Portfolio Not Available</h1>
          <p className="mt-2 text-sm text-slate-500">This dealership does not have the Portfolio module enabled.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F5FA] text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            {brandingLogoUrl ? (
              <img src={brandingLogoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: ACCENT_SOFT }}>
                <Car size={18} style={{ color: ACCENT }} />
              </div>
            )}
            <span className="text-lg font-extrabold uppercase tracking-tight text-slate-900">{tenantName || 'Showroom'}</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
            <button type="button" onClick={() => scrollToId('top')} className="text-slate-900">Home</button>
            <Link to="/portfolio/inventory" className="transition hover:text-slate-900">Inventory</Link>
            <Link to="/portfolio/contact" className="transition hover:text-slate-900">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="pb-16 md:pb-20">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-10 px-6 pb-10 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}
            >
              <Sparkles size={13} /> Featured Arrival
            </span>
            <h1 className="mt-5 text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-slate-900 md:text-6xl">
              Find The Perfect<br />Car For <span style={{ color: ACCENT }}>You</span>
            </h1>
            <p className="mt-5 max-w-md text-slate-500">
              Explore {tenantName || 'our'} curated selection of quality vehicles, each ready for its next owner.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/portfolio/inventory"
                className="rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
              >
                View Inventory
              </Link>
              <Link
                to="/portfolio/contact"
                className="rounded-full px-6 py-3 text-sm font-bold shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: TEAL_SOFT, color: TEAL }}
              >
                Sell Your Car
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Icon size={16} style={{ color: ACCENT }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div
            className="h-72 overflow-hidden rounded-[20px] border border-slate-200 md:h-[26rem]"
            style={{ boxShadow: HERO_IMG_SHADOW }}
          >
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
        <section className="border-t border-slate-200/70 px-6 py-16">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">
              Featured {tenantName || 'Showroom'} Cars
            </h2>

            <div className="relative mt-8">
              <div
                ref={featuredScrollRef}
                className="flex gap-5 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {featuredVehicles.map((v) => (
                  <div key={v.id} className="w-72 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition-shadow hover:shadow-md">
                    <div className="relative h-40 bg-slate-100">
                      {v.cover_thumbnail_url || v.photo_urls?.[0] ? (
                        <img src={v.cover_thumbnail_url || v.photo_urls[0]} alt={`${v.brand_name} ${v.vehicle_model_name}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Car size={36} className="text-slate-300" />
                        </div>
                      )}
                      {isNewListing(v.created_at) ? (
                        <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow" style={{ backgroundColor: ACCENT }}>
                          New
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-slate-900">{v.year} {v.brand_name} {v.vehicle_model_name}</p>
                      <p className="mt-0.5 text-lg font-extrabold" style={{ color: ACCENT }}>{fmtMoney(v.listing_price)}</p>
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] text-slate-500">
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 py-2">
                          <Gauge size={14} />
                          {Number(v.mileage_km || 0).toLocaleString('en-IN')} km
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 py-2 capitalize">
                          <Cog size={14} />
                          {v.transmission}
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 py-2">
                          <Fuel size={14} />
                          {v.fuel_type_name}
                        </div>
                      </div>
                      <Link
                        to={`/portfolio/inventory/${v.id}`}
                        className="mt-4 flex w-full items-center justify-center rounded-full py-2 text-sm font-bold text-white transition hover:opacity-90"
                        style={{ backgroundColor: ACCENT }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {featuredVehicles.length > 3 ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollFeatured(-1)}
                    className="absolute -left-4 top-1/3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollFeatured(1)}
                    className="absolute -right-4 top-1/3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              ) : null}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                to="/portfolio/inventory"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                View all {tenantName || 'showroom'} cars
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Browse by body type */}
      <section className="border-t border-slate-200/70 px-6 py-16">
        <div className="mx-auto max-w-[1240px]">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">Browse By Body Type</h2>
          <div className="mt-8 flex justify-center">
            <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {BODY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectBodyType(type)}
                  className="flex w-24 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-wide transition"
                  style={
                    effectiveBodyType === type
                      ? { backgroundColor: ACCENT, color: '#fff' }
                      : { color: '#64748B' }
                  }
                >
                  <BodyTypeIcon type={type} size={30} active={effectiveBodyType === type} />
                  {type}
                </button>
              ))}
            </div>
          </div>

          {visibleBodyTypeVehicles.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleBodyTypeVehicles.map((v) => (
                <div key={v.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {v.cover_thumbnail_url || v.photo_urls?.[0] ? (
                      <img src={v.cover_thumbnail_url || v.photo_urls[0]} alt={`${v.brand_name} ${v.vehicle_model_name}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Car size={32} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-bold text-slate-900">{v.brand_name} {v.vehicle_model_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="text-sm font-extrabold" style={{ color: ACCENT }}>{fmtMoney(v.listing_price)}</span> onwards
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-slate-400">
              No {effectiveBodyType} listings yet — check back soon.
            </p>
          )}

          {bodyTypeVehicles.length > 0 ? (
            <div className="mt-8 flex justify-center">
              <Link
                to={`/portfolio/inventory?bodyType=${encodeURIComponent(effectiveBodyType)}`}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                View {effectiveBodyType} Cars
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* Promotional banner row */}
      <section className="border-t border-slate-200/70 px-6 py-16">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/70">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Have a car to sell?</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">Sell Your Car With Us</h3>
            <p className="mt-2 text-sm text-slate-500">Get a fair valuation and a hassle-free sale, handled directly by {tenantName || 'our team'}.</p>
            <Link
              to="/portfolio/contact"
              className="mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
            >
              Get Started
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/70">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Questions about a listing?</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">Talk to the Team</h3>
            <p className="mt-2 text-sm text-slate-500">Reach out directly — we typically respond the same day.</p>
            <button
              type="button"
              onClick={handleContactClick}
              className="mt-5 rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: TEAL_SOFT, color: TEAL }}
            >
              Enquire Now
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/70">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{vehicles.length} vehicles listed</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">See Everything In Stock</h3>
            <p className="mt-2 text-sm text-slate-500">Browse the full, filterable inventory in one place.</p>
            <Link
              to="/portfolio/inventory"
              className="mt-5 inline-block rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View Inventory
            </Link>
          </div>
        </div>
      </section>

      {/* Explore popular brands */}
      {brandCounts.length > 0 ? (
        <section id="brands" className="border-t border-slate-200/70 px-6 py-16">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">Explore Popular Brands</h2>

            {popularBrands.length > 0 ? (
              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {/* brandCounts (and therefore popularBrands) is already sorted
                    by count descending, so this is simply the top 12. */}
                {popularBrands.slice(0, 12).map((b) => (
                  <Link
                    key={b.name}
                    to={`/portfolio/inventory?brand=${encodeURIComponent(b.name)}`}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >
                    {b.logoUrl ? (
                      <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-sm transition group-hover:scale-105">
                        <img src={b.logoUrl} alt={b.name} className="h-full w-full object-contain" />
                      </span>
                    ) : (
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-500 transition group-hover:scale-105"
                      >
                        {b.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-900">{b.name}</span>
                    <span className="text-xs font-bold" style={{ color: ACCENT }}>
                      {b.count} {b.count === 1 ? 'car' : 'cars'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-slate-400">No listings yet — check back soon.</p>
            )}

            <div className="mt-8 flex justify-center">
              <Link
                to="/portfolio/inventory"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
          style={{ backgroundColor: ACCENT, boxShadow: '0 25px 50px -15px rgba(75, 17, 107, 0.45)' }}
        >
          <ShieldCheck size={140} className="pointer-events-none absolute -right-6 -top-6 text-white/10" />
          <h2 className="text-3xl font-extrabold uppercase tracking-tight">Ready to find your next car?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Reach out to {tenantName || 'our team'} — we're happy to help you find the right vehicle.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/portfolio/contact"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold shadow transition hover:bg-slate-100"
              style={{ color: ACCENT }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div>
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                {brandingLogoUrl ? (
                  <img src={brandingLogoUrl} alt={tenantName} className="h-7 w-7 rounded object-contain" />
                ) : null}
                <span className="text-lg font-extrabold uppercase tracking-tight text-slate-900">{tenantName || 'Showroom'}</span>
              </div>
              <p className="mt-2 max-w-xs text-sm text-slate-400">
                {branding?.address || 'Quality vehicles, straightforward buying — browse the full inventory or get in touch.'}
              </p>
              {branding?.phone ? (
                <a href={`tel:${branding.phone}`} className="mt-1 inline-block text-sm text-slate-500 hover:text-slate-900">
                  {branding.phone}
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-slate-500 sm:justify-end">
              <button type="button" onClick={() => scrollToId('top')} className="hover:text-slate-900">Home</button>
              <Link to="/portfolio/inventory" className="hover:text-slate-900">Inventory</Link>
              <Link to="/portfolio/contact" className="hover:text-slate-900">Contact</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
