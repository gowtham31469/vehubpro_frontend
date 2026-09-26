import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Car } from 'lucide-react'
import { ACCENT } from './theme'
import hatchbackIcon from '../../assets/images/body-types/hatchback.png'
import sedanIcon from '../../assets/images/body-types/sedan.png'
import suvIcon from '../../assets/images/body-types/suv.png'
import muvIcon from '../../assets/images/body-types/muv.png'
import luxurySedanIcon from '../../assets/images/body-types/luxury-sedan.png'
import luxurySuvIcon from '../../assets/images/body-types/luxury-suv.png'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// Matches the "body_types" master rows seeded for portfolio use (see
// backend/apps/platform/vehicles/migrations/0015_seed_body_types.py).
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

export default function BrowseByBodyTypeSection({ vehicles }) {
  const [selectedBodyType, setSelectedBodyType] = useState('')
  const effectiveBodyType = selectedBodyType || BODY_TYPES[0]

  const bodyTypeVehicles = vehicles
    .filter((v) => v.vehicle_type_name === effectiveBodyType)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const visibleBodyTypeVehicles = bodyTypeVehicles.slice(0, 4)

  return (
    <section className="border-t border-slate-200/70 px-6 py-16">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">Browse By Body Type</h2>
        <div className="mt-8 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {BODY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedBodyType(type)}
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
  )
}
