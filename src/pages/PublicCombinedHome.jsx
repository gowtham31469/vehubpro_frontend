import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Car, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicInventoryVehicles, fetchPublicVehicleBrands } from '../utils/publicPortfolio'
import { fetchPublicServiceCategories, fetchPublicServiceItems } from '../utils/publicServices'
import heroFallbackImage from '../assets/images/hero-bmw-classic.png'
import PublicHeader from '../components/public/PublicHeader.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'
import CTASection from '../components/public/CTASection.jsx'
import FeaturedVehiclesSection from '../components/public/FeaturedVehiclesSection.jsx'
import BrowseByBodyTypeSection from '../components/public/BrowseByBodyTypeSection.jsx'
import PopularBrandsSection from '../components/public/PopularBrandsSection.jsx'
import PopularServicesSection from '../components/public/PopularServicesSection.jsx'
import BrowseByCategorySection from '../components/public/BrowseByCategorySection.jsx'
import { ACCENT, ACCENT_SOFT, BTN_SHADOW, TEAL, TEAL_SOFT } from '../components/public/theme.js'

// Combined homepage for tenants with BOTH the Portfolio and Services modules
// enabled — one Header/Hero/Footer (not duplicated per module), then both
// modules' content sections in turn. Every section below is the exact same
// component PublicPortfolio.jsx / PublicServicesHome.jsx use standalone, so
// nothing here is a copy of their markup.
const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Verified Listings' },
  { icon: BadgeCheck, label: 'Certified Technicians' },
  { icon: Car, label: 'Every Body Type' },
  { icon: Wrench, label: 'Transparent Pricing' },
]

const HERO_IMG_SHADOW = '0 20px 45px -15px rgba(15, 23, 42, 0.25)'

export default function PublicCombinedHome() {
  const { branding, brandingLogoUrl, tenantName, subdomain, tenantError } = useTenantBranding()
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState([])
  const [allBrands, setAllBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!subdomain) return undefined
    let cancelled = false
    fetchPublicInventoryVehicles(subdomain)
      .then((data) => { if (!cancelled) setVehicles(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setVehicles([]) })
    fetchPublicVehicleBrands(subdomain)
      .then((data) => { if (!cancelled) setAllBrands(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setAllBrands([]) })
    fetchPublicServiceCategories(subdomain)
      .then((data) => { if (!cancelled) setCategories(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setCategories([]) })
    fetchPublicServiceItems(subdomain)
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [subdomain])

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactClick = () => {
    showToast('info', `Contact ${tenantName || 'us'} directly — we're happy to help.`)
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
    <div className="min-h-screen bg-[#F6F5FA] text-slate-900">
      <PublicHeader
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        showInventory
        showServices
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
              <Sparkles size={13} /> Buy, Sell & Service
            </span>
            <h1 className="mt-5 text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-slate-900 md:text-6xl">
              Your Car's <span style={{ color: ACCENT }}>One-Stop Shop</span>
            </h1>
            <p className="mt-5 max-w-md text-slate-500">
              {tenantName || 'We'} handle both quality vehicles and expert servicing — browse the inventory or book a service, all in one place.
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
                to="/portfolio/services"
                className="rounded-full px-6 py-3 text-sm font-bold shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: TEAL_SOFT, color: TEAL }}
              >
                Explore Services
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
      <PopularServicesSection items={items} tenantName={tenantName} />
      <BrowseByBodyTypeSection vehicles={vehicles} />
      <BrowseByCategorySection categories={categories} items={items} />
      <PopularBrandsSection vehicles={vehicles} allBrands={allBrands} />

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
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Questions about anything?</p>
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
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{vehicles.length} vehicles · {items.length} services</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">See Everything We Offer</h3>
            <p className="mt-2 text-sm text-slate-500">Browse the full inventory or every service we handle.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/portfolio/inventory"
                className="inline-block rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                View Inventory
              </Link>
              <Link
                to="/portfolio/services"
                className="inline-block rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        heading="Ready to get started?"
        subtext={`Reach out to ${tenantName || 'our team'} — for a car to buy or a service to book, we're here to help.`}
      />

      <PublicFooter
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        branding={branding}
        showInventory
        showServices
        onHomeClick={() => scrollToId('top')}
      />
    </div>
  )
}
