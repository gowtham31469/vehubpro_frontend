import { Link } from 'react-router-dom'
import { Car, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Fixed portfolio theme — same palette as PublicPortfolio.jsx/PublicVehicleDetail.jsx,
// deliberately NOT the tenant's dynamic brand color (theme.accent/accentSoft).
const ACCENT = '#4B116B'
const ACCENT_SOFT = '#F0E4F5'
const BTN_SHADOW = '0 10px 25px -8px rgba(75, 17, 107, 0.5)'

export default function PublicContact() {
  const { branding, brandingLogoUrl, tenantName, tenantError } = useTenantBranding()
  const { showToast } = useToast()

  const handleEnquireClick = () => {
    showToast('info', `Your enquiry has been noted — ${tenantName || 'the dealership'} will reach out to you directly.`)
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
    <div className="min-h-screen bg-[#F6F5FA] font-sans text-slate-900">
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
            <Link to="/portfolio/inventory" className="transition hover:text-slate-900">Inventory</Link>
            <span className="text-slate-900">Contact</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-200/70 px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight md:text-4xl">Get In Touch</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          Reach out to {tenantName || 'our team'} — we're happy to help you find the right vehicle or answer any questions.
        </p>
      </section>

      {/* Contact details */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm shadow-slate-200/70">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: ACCENT_SOFT }}
            >
              <Phone size={20} style={{ color: ACCENT }} />
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-900">Phone</h3>
            {branding?.phone ? (
              <a href={`tel:${branding.phone}`} className="mt-2 block text-lg font-extrabold text-slate-900 hover:underline">
                {branding.phone}
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Not available yet</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm shadow-slate-200/70">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: ACCENT_SOFT }}
            >
              <MapPin size={20} style={{ color: ACCENT }} />
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-900">Address</h3>
            <p className="mt-2 text-sm text-slate-500">
              {branding?.address || 'Address not available yet'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm shadow-slate-200/70">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: ACCENT_SOFT }}
            >
              <Mail size={20} style={{ color: ACCENT }} />
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-900">Enquire</h3>
            <p className="mt-2 text-sm text-slate-500">Send us your requirement and we'll get back to you.</p>
            <button
              type="button"
              onClick={handleEnquireClick}
              className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
            >
              <MessageCircle size={16} />
              Send Enquiry
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-[1240px] px-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
