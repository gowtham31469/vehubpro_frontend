import { Link } from 'react-router-dom'
import { ACCENT } from './theme'

/**
 * Only brands with live inventory get shown here — brand masters with zero
 * current listings are catalog housekeeping, not something a visitor
 * browsing available cars needs to see. Renders nothing if there are none.
 */
export default function PopularBrandsSection({ vehicles, allBrands }) {
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

  const brandCounts = rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const popularBrands = brandCounts.filter((b) => b.count > 0)

  if (brandCounts.length === 0) return null

  return (
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
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-500 transition group-hover:scale-105">
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
  )
}
