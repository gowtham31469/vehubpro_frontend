import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { ACCENT } from './theme'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/**
 * Only categories the tenant has explicitly flagged as "Featured" (via
 * AdminServices.jsx) show as chips here — mirrors is_featured on
 * ServiceItem/InventoryVehicle. The full catalog page (PublicServicesListing.jsx)
 * shows every category regardless of this flag.
 *
 * ServiceCategory.icon_code exists on the model but has no admin UI to set
 * it and no frontend icon lookup table today — chips are plain text/pills,
 * not per-category icons.
 */
export default function BrowseByCategorySection({ categories, items }) {
  const featuredCategories = categories.filter((c) => c.is_featured)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const effectiveCategoryId = selectedCategoryId || featuredCategories[0]?.id || ''
  const effectiveCategory = featuredCategories.find((c) => c.id === effectiveCategoryId)

  if (featuredCategories.length === 0) return null

  const categoryItems = items.filter((i) => i.category === effectiveCategoryId)

  return (
    <section className="border-t border-slate-200/70 px-6 py-16">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">Browse By Category</h2>
        <div className="mt-8 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {featuredCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryId(c.id)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold transition"
                style={
                  effectiveCategoryId === c.id
                    ? { backgroundColor: ACCENT, color: '#fff' }
                    : { color: '#64748B' }
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {categoryItems.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryItems.map((i) => (
              <div key={i.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {i.image_url ? (
                    <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                  ) : (
                    <Wrench size={22} className="text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{i.name}</p>
                  <p className="text-sm font-extrabold" style={{ color: ACCENT }}>{fmtMoney(i.base_price)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-slate-400">
            No {effectiveCategory?.name || 'services'} listed yet — check back soon.
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/portfolio/services"
            className="rounded-full px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            View All Services
          </Link>
          <Link
            to="/portfolio/contact"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Ask About a Service
          </Link>
        </div>
      </div>
    </section>
  )
}
