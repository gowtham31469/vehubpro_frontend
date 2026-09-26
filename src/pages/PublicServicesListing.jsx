import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Search, Wrench } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { fetchPublicServiceCategories, fetchPublicServiceItems } from '../utils/publicServices'
import { ACCENT, ACCENT_SOFT } from '../components/public/theme.js'

const PAGE_SIZE = 24

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function PublicServicesListing() {
  const { branding, brandingLogoUrl, tenantName, subdomain, tenantError } = useTenantBranding()

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!subdomain) {
        setLoading(false)
        setLoadError('This page must be viewed from your workshop subdomain.')
        return
      }
      setLoading(true)
      try {
        const [cats, its] = await Promise.all([fetchPublicServiceCategories(subdomain), fetchPublicServiceItems(subdomain)])
        if (cancelled) return
        setCategories(Array.isArray(cats) ? cats : [])
        setItems(Array.isArray(its) ? its : [])
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load services.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [subdomain])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      const matchesCategory = !selectedCategoryId || i.category === selectedCategoryId
      const matchesSearch = !q || i.name?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [items, search, selectedCategoryId])
  const visibleItems = filteredItems.slice(0, visibleCount)

  const handleSearchChange = (value) => {
    setVisibleCount(PAGE_SIZE)
    setSearch(value)
  }

  const handleSelectCategory = (id) => {
    setVisibleCount(PAGE_SIZE)
    setSelectedCategoryId(id)
  }

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-500">
        <p>This dealership page could not be found.</p>
      </div>
    )
  }

  if (branding?.has_services_access === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-500">
        <p>This workshop does not have the Services module enabled.</p>
      </div>
    )
  }

  const hasPortfolio = branding?.has_portfolio_access === true

  return (
    <div className="min-h-screen bg-[#F6F5FA] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            {brandingLogoUrl ? (
              <img src={brandingLogoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: ACCENT_SOFT }}>
                <Car size={18} style={{ color: ACCENT }} />
              </div>
            )}
            <span className="text-lg font-extrabold uppercase tracking-tight text-slate-900">{tenantName || 'Showroom'}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
            <Link to="/" className="transition hover:text-slate-900">Home</Link>
            {hasPortfolio ? (
              <Link to="/portfolio/inventory" className="transition hover:text-slate-900">Inventory</Link>
            ) : null}
            <span className="text-slate-900">Services</span>
            <Link to="/portfolio/contact" className="transition hover:text-slate-900">Contact</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900 md:text-3xl">All Services</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? 'Loading services…' : `${filteredItems.length} service${filteredItems.length === 1 ? '' : 's'} found`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search services…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSelectCategory('')}
            className="rounded-full px-4 py-2 text-sm font-bold transition"
            style={!selectedCategoryId ? { backgroundColor: ACCENT, color: '#fff' } : { color: '#64748B', backgroundColor: '#fff', border: '1px solid #E2E8F0' }}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCategory(c.id)}
              className="rounded-full px-4 py-2 text-sm font-bold transition"
              style={selectedCategoryId === c.id ? { backgroundColor: ACCENT, color: '#fff' } : { color: '#64748B', backgroundColor: '#fff', border: '1px solid #E2E8F0' }}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-16 text-center text-slate-400">Loading services…</p>
        ) : loadError ? (
          <p className="py-16 text-center text-rose-600">{loadError}</p>
        ) : filteredItems.length === 0 ? (
          <p className="py-16 text-center text-slate-400">No services match your search right now.</p>
        ) : (
          <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((i) => (
              <div key={i.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition-shadow hover:shadow-md">
                <div className="relative h-36 bg-slate-100">
                  {i.image_url ? (
                    <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Wrench size={30} className="text-slate-300" />
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
                </div>
              </div>
            ))}
          </div>

          {visibleCount < filteredItems.length ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Load More ({filteredItems.length - visibleCount} remaining)
              </button>
            </div>
          ) : null}
          </>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-[1240px] px-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
