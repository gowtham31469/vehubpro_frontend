import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { Camera, Car, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useTenantBranding } from '../context/TenantBrandingContext.jsx'

// Fixed portfolio theme — same palette as PublicPortfolio.jsx/PublicVehicleDetail.jsx,
// deliberately NOT the tenant's dynamic brand color (theme.accent/accentSoft).
const ACCENT = '#4B116B'
const ACCENT_SOFT = '#F0E4F5'
const TEAL = '#0F766E'
const TEAL_SOFT = '#CCFBF1'
const BTN_SHADOW = '0 10px 25px -8px rgba(75, 17, 107, 0.5)'

export default function PublicContact() {
  const { branding, brandingLogoUrl, tenantName, tenantError } = useTenantBranding()
  const [qrDataUrl, setQrDataUrl] = useState('')

  const instagramHandle = branding?.instagram_handle || ''

  useEffect(() => {
    let cancelled = false
    async function generate() {
      if (!instagramHandle) {
        setQrDataUrl('')
        return
      }
      try {
        const url = await QRCode.toDataURL(`https://instagram.com/${instagramHandle}`, {
          margin: 1,
          width: 220,
          color: { dark: ACCENT, light: '#FFFFFF' },
        })
        if (!cancelled) setQrDataUrl(url)
      } catch {
        if (!cancelled) setQrDataUrl('')
      }
    }
    void generate()
    return () => { cancelled = true }
  }, [instagramHandle])

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

  // Contact is a shared page — useful regardless of which module(s) a
  // tenant has, so it's never gated on has_portfolio_access. Only the nav
  // links below vary by module.
  const hasPortfolio = branding?.has_portfolio_access === true
  const hasServices = branding?.has_services_access === true
  const whatsappNumber = branding?.whatsapp_number || ''

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F6F5FA] font-sans text-slate-900">
      {/* Header */}
      <header className="z-30 shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
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
            {hasServices ? (
              <Link to="/portfolio/services" className="transition hover:text-slate-900">Services</Link>
            ) : null}
            <span className="text-slate-900">Contact</span>
          </nav>
        </div>
      </header>

      {/* max-h-full + overflow-y-auto is a safety net for very short viewports
          only — the page itself never scrolls (h-screen overflow-hidden
          above); sizing below is deliberately compact so this fits in one
          view on ordinary desktop/laptop heights without needing that scroll. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Hero */}
        <section className="px-6 py-6 text-center">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Get In Touch</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Reach out to {tenantName || 'our team'} — we're happy to help you find the right vehicle or answer any questions.
          </p>
        </section>

        {/* Contact details */}
        <section className="px-6 pb-6">
          {/* Single column when there's no Instagram handle to show a QR for —
              two columns (info + follow-us) otherwise. Neither column is a
              fixed-width grid cell, so this stays centered either way. */}
          <div className={`mx-auto grid max-w-[900px] grid-cols-1 gap-5 ${instagramHandle ? 'md:grid-cols-2' : ''}`}>
            {/* Contact details card */}
            <div className="flex flex-col justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
              <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">Contact Details</h2>

              <div className="mt-4 space-y-3.5">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: ACCENT_SOFT }}>
                    <Phone size={16} style={{ color: ACCENT }} />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone</p>
                    {branding?.phone ? (
                      <a href={`tel:${branding.phone}`} className="text-sm font-bold text-slate-900 hover:underline">
                        {branding.phone}
                      </a>
                    ) : (
                      <p className="text-sm text-slate-400">Not available yet</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: ACCENT_SOFT }}>
                    <MapPin size={16} style={{ color: ACCENT }} />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Address</p>
                    <p className="text-sm text-slate-600">{branding?.address || 'Address not available yet'}</p>
                  </div>
                </div>
              </div>

              {whatsappNumber ? (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </a>
              ) : null}
            </div>

            {/* Follow us — Instagram QR */}
            {instagramHandle ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm shadow-slate-200/70">
                <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">Follow Us</h2>
                <div className="mt-3 flex h-[124px] w-[124px] items-center justify-center rounded-2xl bg-slate-50 p-2.5 shadow-sm">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt={`Instagram QR code for @${instagramHandle}`} className="h-full w-full" />
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-sm font-bold text-slate-900">@{instagramHandle}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: TEAL_SOFT, color: TEAL }}>
                    INSTAGRAM
                  </span>
                </div>
                <p className="mx-auto mt-1.5 max-w-[220px] text-xs text-slate-500">
                  Scan with your camera, or tap below to follow on Instagram.
                </p>
                <a
                  href={`https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: ACCENT, boxShadow: BTN_SHADOW }}
                >
                  <Camera size={16} />
                  Follow on Instagram
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-[1240px] px-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {tenantName || 'Showroom'}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
