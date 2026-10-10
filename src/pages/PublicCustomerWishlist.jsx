import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, Cog, Fuel, Gauge, Heart } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import PublicHeader from '../components/public/PublicHeader.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'
import { ACCENT } from '../components/public/theme.js'
import { fetchWishlist, isCustomerAuthenticated, removeFromWishlist } from '../utils/customerAuth'

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function PublicCustomerWishlist() {
  const { branding, brandingLogoUrl, tenantName, tenantError } = useTenantBranding()
  const navigate = useNavigate()

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const hasPortfolio = branding?.has_portfolio_access === true
  const hasServices = branding?.has_services_access === true

  useEffect(() => {
    if (!isCustomerAuthenticated()) {
      navigate('/portfolio/login')
      return
    }
    fetchWishlist()
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => setLoadError('Could not load your wishlist.'))
      .finally(() => setLoading(false))
  }, [navigate])

  const handleRemove = async (vehicleId) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
    try {
      await removeFromWishlist(vehicleId)
    } catch {
      // Best-effort optimistic removal — a stale item reappearing on next visit is harmless.
    }
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5FA] font-sans text-slate-900">
      <PublicHeader
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        showInventory={hasPortfolio}
        showServices={hasServices}
        onHomeClick={() => navigate('/')}
      />

      <div className="mx-auto w-full max-w-[1240px] flex-1 px-6 py-14">
        <h1 className="text-2xl font-bold text-slate-900">My Wishlist</h1>
        <p className="mt-1 text-sm text-slate-500">Vehicles you've saved for later.</p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-400">Loading…</p>
        ) : loadError ? (
          <p className="mt-8 text-sm text-rose-600">{loadError}</p>
        ) : vehicles.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 py-16 text-center">
            <p className="text-sm text-slate-500">No saved vehicles yet — browse the inventory to save some.</p>
            {hasPortfolio ? (
              <Link
                to="/portfolio/inventory"
                className="mt-4 inline-flex rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                Browse Inventory
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition-shadow hover:shadow-md">
                <div className="relative h-40 bg-slate-100">
                  {v.cover_thumbnail_url || v.photo_urls?.[0] ? (
                    <img src={v.cover_thumbnail_url || v.photo_urls[0]} alt={`${v.brand_name} ${v.vehicle_model_name}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car size={36} className="text-slate-300" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(v.id)}
                    aria-label="Remove from wishlist"
                    className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow transition hover:bg-white"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
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
        )}
      </div>

      <PublicFooter
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        branding={branding}
        showInventory={hasPortfolio}
        showServices={hasServices}
        onHomeClick={() => navigate('/')}
      />
    </div>
  )
}
