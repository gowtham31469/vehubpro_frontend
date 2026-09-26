import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Clock3, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchPublicServiceCategories, fetchPublicServiceItems } from '../utils/publicServices'
import PublicHeader from '../components/public/PublicHeader.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'
import CTASection from '../components/public/CTASection.jsx'
import PopularServicesSection from '../components/public/PopularServicesSection.jsx'
import BrowseByCategorySection from '../components/public/BrowseByCategorySection.jsx'
import { ACCENT, ACCENT_SOFT, BTN_SHADOW, TEAL, TEAL_SOFT } from '../components/public/theme.js'

const TRUST_POINTS = [
  { icon: BadgeCheck, label: 'Certified Technicians' },
  { icon: ShieldCheck, label: 'Genuine Parts' },
  { icon: Clock3, label: 'Quick Turnaround' },
  { icon: Wrench, label: 'Transparent Pricing' },
]

export default function PublicServicesHome() {
  const { branding, brandingLogoUrl, tenantName, subdomain, tenantError } = useTenantBranding()
  const { showToast } = useToast()

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!subdomain) return undefined
    let cancelled = false
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
    showToast('info', `Contact ${tenantName || 'the workshop'} directly to book a service.`)
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

  if (branding?.has_services_access === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-slate-900">
        <div>
          <h1 className="text-xl font-bold">Services Not Available</h1>
          <p className="mt-2 text-sm text-slate-500">This workshop does not have the Services module enabled.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F5FA] text-slate-900">
      <PublicHeader
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        showInventory={false}
        showServices
        onHomeClick={() => scrollToId('top')}
      />

      {/* Hero */}
      <section id="top" className="pb-16 md:pb-20">
        <div className="mx-auto max-w-[1240px] px-6 pb-10 pt-14 text-center md:pt-20">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}
          >
            <Sparkles size={13} /> Trusted Car Care
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-slate-900 md:text-6xl">
            Expert Care For <span style={{ color: ACCENT }}>Your Vehicle</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-slate-500">
            {tenantName || 'Our workshop'} handles everything from routine maintenance to major repairs — book a service or get a free quote.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/portfolio/contact"
              className="rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
            >
              Book a Service
            </Link>
            <button
              type="button"
              onClick={handleContactClick}
              className="rounded-full px-6 py-3 text-sm font-bold shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: TEAL_SOFT, color: TEAL }}
            >
              Get a Free Quote
            </button>
          </div>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                <Icon size={16} style={{ color: ACCENT }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <PopularServicesSection items={items} tenantName={tenantName} />
      <BrowseByCategorySection categories={categories} items={items} />

      {/* Promotional banner row */}
      <section className="border-t border-slate-200/70 px-6 py-16">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/70">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Need a service?</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">Book Your Service</h3>
            <p className="mt-2 text-sm text-slate-500">Get a fair quote and a hassle-free service, handled directly by {tenantName || 'our team'}.</p>
            <Link
              to="/portfolio/contact"
              className="mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
            >
              Get Started
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/70">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Questions about a service?</p>
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
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{items.length} services offered</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">See Everything We Offer</h3>
            <p className="mt-2 text-sm text-slate-500">Browse every service category we handle in one place.</p>
            <Link
              to="/portfolio/services"
              className="mt-5 inline-block rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View Services
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        heading="Ready to service your vehicle?"
        subtext={`Reach out to ${tenantName || 'our team'} — we're happy to help keep your vehicle in top shape.`}
      />

      <PublicFooter
        brandingLogoUrl={brandingLogoUrl}
        tenantName={tenantName}
        branding={branding}
        showInventory={false}
        showServices
        onHomeClick={() => scrollToId('top')}
      />
    </div>
  )
}
