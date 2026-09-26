import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Car, ChevronLeft, ChevronRight, Cog, Fuel, Gauge } from 'lucide-react'
import { ACCENT } from './theme'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function isNewListing(createdAt) {
  if (!createdAt) return false
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days <= 10
}

/**
 * Only vehicles the tenant has explicitly flagged as "Featured" (via
 * AdminInventoryVehicleForm.jsx) show here — not just the cheapest/newest of
 * the whole inventory. Renders nothing if there are none, so callers don't
 * need their own conditional wrapper.
 */
export default function FeaturedVehiclesSection({ vehicles, tenantName }) {
  const scrollRef = useRef(null)

  const featuredVehicles = vehicles
    .filter((v) => v.is_featured)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  if (featuredVehicles.length === 0) return null

  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })

  return (
    <section className="border-t border-slate-200/70 px-6 py-16">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">
          Featured {tenantName || 'Showroom'} Cars
        </h2>

        <div className="relative mt-8">
          <div
            ref={scrollRef}
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
                onClick={() => scroll(-1)}
                className="absolute -left-4 top-1/3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
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
  )
}
