import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicInventoryVehicles, fetchPublicVehicleBrands } from '../utils/publicPortfolio'
import heroFallbackImage from '../assets/images/hero-bmw-classic.png'
import PublicHeader from '../components/public/PublicHeader.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'
import CTASection from '../components/public/CTASection.jsx'
import FeaturedVehiclesSection from '../components/public/FeaturedVehiclesSection.jsx'
import BrowseByBodyTypeSection from '../components/public/BrowseByBodyTypeSection.jsx'
import PopularBrandsSection from '../components/public/PopularBrandsSection.jsx'
import { ACCENT, ACCENT_SOFT, BTN_SHADOW, TEAL, TEAL_SOFT } from '../components/public/theme.js'

const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Verified Listings' },
  { icon: Sparkles, label: 'Real-Time Inventory' },
  { icon: Search, label: 'Easy Search & Filter' },
  { icon: Car, label: 'Every Body Type' },
]

const HERO_IMG_SHADOW = '0 20px 45px -15px rgba(15, 23, 42, 0.25)'

export default function PublicPortfolio() {
  const { branding, brandingLogoUrl, tenantName, subdomain, tenantError } = useTenantBranding()
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState([])
  const [allBrands, setAllBrands] = useState([])

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

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactClick = () => {
    showToast('info', `Contact ${tenantName || 'the dealership'} directly to enquire about this vehicle.`)
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
      <PublicHeader
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        showInventory
        showServices={false}
        onHomeClick={() => scrollToId('top')}
      />

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
                View All Cars
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

      <FeaturedVehiclesSection vehicles={vehicles} tenantName={tenantName} />
      <BrowseByBodyTypeSection vehicles={vehicles} />

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
            <p className="mt-2 text-sm text-slate-500">Browse the full, filterable list of cars in one place.</p>
            <Link
              to="/portfolio/inventory"
              className="mt-5 inline-block rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View All Cars
            </Link>
          </div>
        </div>
      </section>

      <PopularBrandsSection vehicles={vehicles} allBrands={allBrands} />

      <CTASection
        heading="Ready to find your next car?"
        subtext={`Reach out to ${tenantName || 'our team'} — we're happy to help you find the right vehicle.`}
      />

      <PublicFooter
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        branding={branding}
        showInventory
        showServices={false}
        onHomeClick={() => scrollToId('top')}
      />
    </div>
  )
}
