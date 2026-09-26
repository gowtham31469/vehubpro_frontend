import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react'
import { ACCENT } from './theme'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/**
 * Only services the tenant has explicitly flagged as "Featured" (via
 * AdminServices.jsx) show here. Renders nothing if there are none, so
 * callers don't need their own conditional wrapper.
 */
export default function PopularServicesSection({ items, tenantName }) {
  const scrollRef = useRef(null)
  const featuredItems = items.filter((i) => i.is_featured)

  if (featuredItems.length === 0) return null

  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })

  return (
    <section className="border-t border-slate-200/70 px-6 py-16">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">
          Popular Services at {tenantName || 'Our Garage'}
        </h2>

        <div className="relative mt-8">
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {featuredItems.map((i) => (
              <div key={i.id} className="w-72 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition-shadow hover:shadow-md">
                <div className="relative h-40 bg-slate-100">
                  {i.image_url ? (
                    <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Wrench size={32} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {i.category_name ? (
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{i.category_name}</p>
                  ) : null}
                  <p className="mt-0.5 font-bold text-slate-900">{i.name}</p>
                  <p className="mt-0.5 text-lg font-extrabold" style={{ color: ACCENT }}>{fmtMoney(i.base_price)}</p>
                  {i.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{i.description}</p>
                  ) : null}
                  <Link
                    to="/portfolio/contact"
                    className="mt-4 flex w-full items-center justify-center rounded-full py-2 text-sm font-bold text-white transition hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Enquire Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {featuredItems.length > 3 ? (
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
      </div>
    </section>
  )
}
