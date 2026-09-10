import { Link } from 'react-router-dom'
import { Car, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function PublicContact() {
  const { theme, branding, brandingLogoUrl, tenantName, tenantError, tenantErrorCode } = useTenantBranding()
  const { showToast } = useToast()

  const handleEnquireClick = () => {
    showToast('info', `Your enquiry has been noted — ${tenantName || 'the dealership'} will reach out to you directly.`)
  }

  if (tenantError) {
    const isPortfolioDisabled = tenantErrorCode === 'PORTFOLIO_MODULE_NOT_ENABLED'
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-4 text-center text-white">
        <div>
          <h1 className="text-xl font-bold">{isPortfolioDisabled ? 'Portfolio Not Available' : 'Dealership not found'}</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            {isPortfolioDisabled
              ? 'This dealership does not have the Portfolio module enabled.'
              : 'Please check the URL and try again.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] font-sans text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#1A1A1A] bg-[#0B0B0B]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          <Link to="/portfolio" className="flex items-center gap-2.5">
            {brandingLogoUrl ? (
              <img src={brandingLogoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: theme.accentSoft }}>
                <Car size={18} style={{ color: theme.accent }} />
              </div>
            )}
            <span className="text-lg font-extrabold uppercase tracking-tight text-white">{tenantName || 'Showroom'}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#9CA3AF] md:flex">
            <Link to="/portfolio" className="transition hover:text-white">Home</Link>
            <Link to="/portfolio/inventory" className="transition hover:text-white">Inventory</Link>
            <span className="text-white">Contact</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[#1A1A1A] px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight md:text-4xl">Get In Touch</h1>
        <p className="mx-auto mt-3 max-w-xl text-[#9CA3AF]">
          Reach out to {tenantName || 'our team'} — we're happy to help you find the right vehicle or answer any questions.
        </p>
      </section>

      {/* Contact details */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-[#262626] bg-[#141414] p-7 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.accentSoft }}
            >
              <Phone size={20} style={{ color: theme.accent }} />
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-white">Phone</h3>
            {branding?.phone ? (
              <a href={`tel:${branding.phone}`} className="mt-2 block text-lg font-extrabold text-white hover:underline">
                {branding.phone}
              </a>
            ) : (
              <p className="mt-2 text-sm text-[#6B7280]">Not available yet</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#262626] bg-[#141414] p-7 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.accentSoft }}
            >
              <MapPin size={20} style={{ color: theme.accent }} />
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-white">Address</h3>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              {branding?.address || 'Address not available yet'}
            </p>
          </div>

          <div className="rounded-2xl border border-[#262626] bg-[#141414] p-7 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.accentSoft }}
            >
              <Mail size={20} style={{ color: theme.accent }} />
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-white">Enquire</h3>
            <p className="mt-2 text-sm text-[#9CA3AF]">Send us your requirement and we'll get back to you.</p>
            <button
              type="button"
              onClick={handleEnquireClick}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              <MessageCircle size={16} />
              Send Enquiry
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] py-8">
        <div className="mx-auto max-w-[1240px] px-6 text-center text-xs text-[#6B7280]">
          © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
